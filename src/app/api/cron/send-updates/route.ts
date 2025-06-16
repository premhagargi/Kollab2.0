
// src/app/api/cron/send-updates/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { recordAutoUpdateSent, updateWorkflow } from '@/services/workflowService';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import type { Workflow } from '@/types';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'; // Ensures the route is not statically analyzed or pre-rendered at build time

const WORKFLOWS_COLLECTION = 'boards'; // As per your workflowService

// Local helper function for timestamps within this file
const mapTimestampToISO = (timestampField: any): string | undefined => {
    if (timestampField instanceof Timestamp) {
      return timestampField.toDate().toISOString();
    }
    // If it's already a string (e.g., from client-side calculation or previous conversion), return it.
    if (typeof timestampField === 'string') {
      try {
        // Validate if it's a valid ISO string by trying to parse it
        new Date(timestampField).toISOString();
        return timestampField;
      } catch (e) {
        // Not a valid date string, treat as undefined
        return undefined;
      }
    }
    return undefined; // Return undefined if it's not a Timestamp or a string
  };


async function getAllEnabledWorkflowsForCron(): Promise<Workflow[]> {
  try {
    if (!db) {
      console.error("Firestore 'db' instance is not available in getAllEnabledWorkflowsForCron. Firebase might not be initialized correctly for this environment.");
      return [];
    }
    const q = query(
      collection(db, WORKFLOWS_COLLECTION),
      where('autoUpdateEnabled', '==', true)
    );
    const querySnapshot = await getDocs(q);
    const workflows: Workflow[] = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      const currentDocId = docSnap.id; // Explicitly capture docSnap.id

      // Strict validation: ensure all critical fields are present before constructing the Workflow object
      if (!currentDocId || !data || !data.ownerId || !data.name || !data.autoUpdateClientEmail || !data.columns) {
        console.warn(
            `CRON Pre-check: Workflow document ${currentDocId || 'ID_MISSING_FROM_DOCSNAP'} is missing essential fields ` +
            `(ownerId, name, autoUpdateClientEmail, or columns) or data object is missing. Skipping. Document Data:`,
            JSON.stringify(data) // Log the data for debugging
        );
        return; // Skip this document, do not add to workflows array
      }

      const workflowItem: Workflow = {
        id: currentDocId, // Use the validated currentDocId
        name: data.name,
        ownerId: data.ownerId,
        columns: data.columns,
        template: data.template,
        createdAt: mapTimestampToISO(data.createdAt),
        updatedAt: mapTimestampToISO(data.updatedAt),
        autoUpdateEnabled: data.autoUpdateEnabled ?? false,
        autoUpdateFrequency: data.autoUpdateFrequency,
        autoUpdateClientEmail: data.autoUpdateClientEmail,
        autoUpdateLastSent: mapTimestampToISO(data.autoUpdateLastSent),
        autoUpdateNextSend: mapTimestampToISO(data.autoUpdateNextSend),
      };
      workflows.push(workflowItem);
    });
    return workflows;
  } catch (error) {
    console.error("CRON: Error fetching enabled workflows:", error);
    // In case of a DB error, return an empty array to prevent the main loop from failing
    return [];
  }
}


export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET_KEY;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error("CRON_SECRET_KEY is not set in environment variables.");
    return NextResponse.json({ error: 'CRON job misconfigured on server (no secret key).' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized CRON attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("CRON job: Send automated updates - Started");
  let updatesSentCount = 0;
  let errorsCount = 0;

  try {
    const workflows = await getAllEnabledWorkflowsForCron();
    const now = new Date();

    for (const workflow of workflows) {
      // Rigorous check for the workflow object and its id before any access
      if (!workflow || typeof workflow !== 'object' || !workflow.id || !workflow.ownerId) {
          console.error(
            "CRON job loop: Encountered an invalid/undefined workflow object or missing ID/OwnerID. This should have been caught by getAllEnabledWorkflowsForCron. Skipping.",
            JSON.stringify(workflow) // Log the problematic workflow object
          );
          errorsCount++;
          continue;
      }

      if (!workflow.autoUpdateEnabled || !workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail) {
        // This workflow is not configured for auto-updates or essential info is missing.
        // console.log(`Workflow ${workflow.id} skipped in main loop (not enabled, or missing nextSend/email).`);
        continue;
      }

      const nextSendDate = new Date(workflow.autoUpdateNextSend);
      if (now >= nextSendDate) {
        console.log(`CRON: Processing workflow: ${workflow.name} (ID: ${workflow.id}) for user ${workflow.ownerId}`);
        try {
          // Ensure workflow.name is also present, though it should be from getAllEnabledWorkflowsForCron
          if (!workflow.name) {
            console.error(`CRON: Workflow ${workflow.id} is missing a name. Skipping summary generation.`);
            errorsCount++;
            continue;
          }

          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId, // Already checked this exists
            workflow.id,       // Already checked this exists
            workflow.name,     // Checked just above
            "Automated Progress Update",
            `Covering progress up to ${now.toLocaleDateString()}`
          );

          if (summaryResult.summaryText.startsWith('Error:')) {
            console.error(`CRON: Error generating summary for workflow ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            continue;
          }

          const emailResult = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail, // Already checked this exists
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
          });

          if (emailResult.success) {
            console.log(`CRON: Successfully sent update for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency || 'weekly');
            updatesSentCount++;
          } else {
            console.error(`CRON: Failed to send email for workflow ${workflow.id}: ${emailResult.message}`);
            errorsCount++;
          }
        } catch (e) {
          console.error(`CRON: Error processing workflow ${workflow.id} during AI/Email phase:`, e);
          errorsCount++;
        }
      }
    }

    console.log(`CRON job: Send automated updates - Finished. Updates Sent: ${updatesSentCount}, Errors: ${errorsCount}`);
    return NextResponse.json({
      message: 'Automated updates processed.',
      updatesSent: updatesSentCount,
      errors: errorsCount
    });

  } catch (error) {
    console.error('CRON job: General error processing automated updates:', error);
    return NextResponse.json({ error: 'Failed to process automated updates' }, { status: 500 });
  }
}
