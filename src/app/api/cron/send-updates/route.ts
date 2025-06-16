
// src/app/api/cron/send-updates/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { recordAutoUpdateSent, updateWorkflow } from '@/services/workflowService';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import type { Workflow } from '@/types';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const WORKFLOWS_COLLECTION = 'boards'; // As per your workflowService

// Local helper function for timestamps within this file
const mapTimestampToISO = (timestampField: any): string | undefined => {
    if (timestampField instanceof Timestamp) {
      return timestampField.toDate().toISOString();
    }
    // If it's already a string (e.g., from client-side calculation or previous conversion), return it.
    if (typeof timestampField === 'string') {
      return timestampField;
    }
    return undefined; // Return undefined if it's not a Timestamp or a string
  };


async function getAllEnabledWorkflowsForCron(): Promise<Workflow[]> {
  try {
    const q = query(
      collection(db, WORKFLOWS_COLLECTION),
      where('autoUpdateEnabled', '==', true)
    );
    const querySnapshot = await getDocs(q);
    const workflows: Workflow[] = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();

      // Validate essential fields for CRON job processing
      if (!docSnap.id || !data || !data.ownerId || !data.name || !data.autoUpdateClientEmail || !data.columns) {
        console.warn(
            `Workflow document ${docSnap.id || 'ID_MISSING_FROM_DOCSNAP'} is missing essential fields ` +
            `(ownerId, name, autoUpdateClientEmail, or columns) or data object is missing. Skipping. Document Data:`, 
            data
        );
        return; // Skip this document as it's not a valid Workflow for processing
      }

      const workflowItem: Workflow = {
        id: docSnap.id, // docSnap.id is guaranteed by Firestore
        name: data.name, // Validated above
        ownerId: data.ownerId, // Validated above
        columns: data.columns, // Validated above
        template: data.template, // Optional
        createdAt: mapTimestampToISO(data.createdAt),
        updatedAt: mapTimestampToISO(data.updatedAt),
        autoUpdateEnabled: data.autoUpdateEnabled ?? false, // Default to false if missing
        autoUpdateFrequency: data.autoUpdateFrequency, // Optional
        autoUpdateClientEmail: data.autoUpdateClientEmail, // Validated above
        autoUpdateLastSent: mapTimestampToISO(data.autoUpdateLastSent), // Optional
        autoUpdateNextSend: mapTimestampToISO(data.autoUpdateNextSend), // Optional
      };
      workflows.push(workflowItem);
    });
    return workflows;
  } catch (error) {
    console.error("Error fetching enabled workflows for CRON:", error);
    throw error; // Or return empty array, but throwing helps identify issues
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
      // Due to the checks in getAllEnabledWorkflowsForCron, 'workflow' should be a valid object.
      // Additional checks here are for runtime safety if absolutely necessary, but primary validation is above.
      if (!workflow || typeof workflow !== 'object' || !workflow.id) {
          console.error("CRON job loop: Encountered an invalid/undefined workflow object. This should have been caught by getAllEnabledWorkflowsForCron. Skipping.", workflow);
          errorsCount++;
          continue;
      }
      
      if (!workflow.autoUpdateEnabled || !workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail || !workflow.ownerId) {
        // This check is still useful if a workflow was valid but somehow became invalid for processing (e.g., ownerId removed after fetch - unlikely but possible)
        // Or if specific fields required for this step are missing.
        // console.log(`Workflow ${workflow.id} skipped. Conditions: enabled=${workflow.autoUpdateEnabled}, nextSend=${workflow.autoUpdateNextSend}, email=${workflow.autoUpdateClientEmail}, owner=${workflow.ownerId}`);
        if (!workflow.ownerId) {
            console.warn(`Workflow ${workflow.id} skipped in main loop because ownerId is missing.`);
        }
        continue;
      }

      const nextSendDate = new Date(workflow.autoUpdateNextSend);
      if (now >= nextSendDate) {
        console.log(`Processing workflow: ${workflow.name} (ID: ${workflow.id}) for user ${workflow.ownerId}`);
        try {
          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId, 
            workflow.id,
            workflow.name,
            "Automated Progress Update", 
            `Covering progress up to ${now.toLocaleDateString()}`
          );

          if (summaryResult.summaryText.startsWith('Error:')) {
            console.error(`Error generating summary for workflow ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            await updateWorkflow(workflow.id, { autoUpdateNextSend: undefined }); 
            continue;
          }

          const emailResult = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail,
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
          });

          if (emailResult.success) {
            console.log(`Successfully sent update for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency || 'weekly');
            updatesSentCount++;
          } else {
            console.error(`Failed to send email for workflow ${workflow.id}: ${emailResult.message}`);
            errorsCount++;
          }
        } catch (e) {
          console.error(`Error processing workflow ${workflow.id}:`, e);
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
