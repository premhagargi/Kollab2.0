
// src/app/api/cron/send-updates/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { recordAutoUpdateSent, calculateNextSendDate } from '@/services/workflowService'; // Assuming calculateNextSendDate is exported if needed here, or handled by recordAutoUpdateSent
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import type { Workflow } from '@/types'; // Ensure Workflow type is correctly imported
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'; // Ensures the route is dynamic and not statically analyzed deeply

const WORKFLOWS_COLLECTION = 'boards'; // Still using 'boards' as the Firestore collection name

// Local helper to safely map Firestore timestamps or existing ISO strings
const mapTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  if (typeof timestampField === 'string') {
    // Validate if it's a parsable date string before returning, or just return if confident
    try {
      new Date(timestampField).toISOString(); // Check if it's a valid ISO string
      return timestampField;
    } catch (e) {
      // console.warn("mapTimestampToISO: Received string that's not a valid ISO date:", timestampField);
      return undefined; // Or handle as an error, or return as is if that's intended
    }
  }
  return undefined; // Return undefined if it's not a Timestamp or a recognizable string
};


async function getAllEnabledWorkflowsForCron(): Promise<Workflow[]> {
  try {
    if (!db) {
      console.error("CRON: Firestore 'db' is not available. Cannot fetch workflows.");
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
      const currentDocId = docSnap.id;

      if (!currentDocId || !data || !data.ownerId || !data.name || !data.autoUpdateClientEmail || !data.columns) {
        console.warn(
          `CRON: Incomplete workflow document data for ID ${currentDocId}. Skipping this workflow.`,
          { id: currentDocId, hasData: !!data, hasOwnerId: !!data?.ownerId, hasName: !!data?.name, hasClientEmail: !!data?.autoUpdateClientEmail, hasColumns: !!data?.columns }
        );
        return; 
      }
      
      // Explicitly construct to ensure all fields are either present or correctly undefined based on types
      const workflowCandidate: Workflow = {
        id: currentDocId,
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
      workflows.push(workflowCandidate);
    });
    return workflows;
  } catch (error) {
    console.error("CRON: Error fetching workflows for CRON job:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET_KEY;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error("CRON Error: Missing CRON_SECRET_KEY in environment.");
    return NextResponse.json({ error: 'Server misconfigured. CRON_SECRET_KEY not set.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("CRON Warning: Unauthorized CRON request attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("CRON: Starting automated updates job...");
  let updatesSentCount = 0;
  let errorsCount = 0;

  try {
    const fetchedWorkflows = await getAllEnabledWorkflowsForCron();

    // Defensive filter: ensure every workflow object is valid and has an id and ownerId before processing.
    const workflowsToProcess = fetchedWorkflows.filter(wf => 
        wf && 
        typeof wf === 'object' && 
        typeof wf.id === 'string' && wf.id.length > 0 &&
        typeof wf.ownerId === 'string' && wf.ownerId.length > 0 &&
        typeof wf.name === 'string' // Also ensuring name is present as it's used
    );

    if (fetchedWorkflows.length !== workflowsToProcess.length) {
        console.warn(`CRON: Filtered out ${fetchedWorkflows.length - workflowsToProcess.length} invalid or incomplete workflow objects before processing.`);
    }
    
    const now = new Date();

    for (const workflow of workflowsToProcess) {
        // The object 'workflow' should be valid here due to the filter above.
        // The previous explicit checks for workflow, workflow.id, workflow.ownerId can be removed or kept for extreme caution.
        // For instance, this check is now largely redundant:
        // if (!workflow.id || !workflow.ownerId) { /* ... */ continue; }

      if (!workflow.autoUpdateEnabled || !workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail) {
        // This check is still relevant for the logic.
        continue;
      }

      const nextSendDate = new Date(workflow.autoUpdateNextSend);
      if (now >= nextSendDate) {
        console.log(`CRON: Processing update for workflow: ${workflow.name} (ID: ${workflow.id})`);

        try {
          // workflow.name is checked by the filter, so it should be safe to use.
          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId, // Safe due to filter
            workflow.id,      // Safe due to filter
            workflow.name,    // Safe due to filter
            "Automated Progress Update",
            `Covering progress up to ${now.toLocaleDateString()}`
          );

          if (summaryResult.summaryText.startsWith('Error:')) {
            console.error(`CRON: Summary generation error for workflow ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            continue;
          }

          const emailResult = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail,
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
          });

          if (emailResult.success) {
            console.log(`CRON: Update sent for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency || 'weekly');
            updatesSentCount++;
          } else {
            console.error(`CRON: Email send failed for workflow ${workflow.id}: ${emailResult.message}`);
            errorsCount++;
          }
        } catch (e) {
          console.error(`CRON: Error during processing of workflow ${workflow.id}:`, e);
          errorsCount++;
        }
      }
    }

    console.log(`CRON: Automated updates job completed. Sent: ${updatesSentCount}, Errors: ${errorsCount}`);
    return NextResponse.json({
      message: 'Automated updates processed successfully.',
      updatesSent: updatesSentCount,
      errors: errorsCount,
    });

  } catch (error)
   {
    console.error('CRON: General processing error in automated updates job:', error);
    return NextResponse.json({ error: 'CRON job processing failed due to an internal server error.' }, { status: 500 });
  }
}
