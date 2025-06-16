
// src/app/api/cron/send-updates/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getWorkflowsByOwner, recordAutoUpdateSent, updateWorkflow } from '@/services/workflowService'; // Assuming getWorkflowsByOwner can be adapted or a new function to get all relevant workflows is made
import { getAllTasksByOwner } from '@/services/taskService'; // Needed for summary generation
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import type { Workflow } from '@/types';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const WORKFLOWS_COLLECTION = 'boards'; // As per your workflowService

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
      workflows.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
        autoUpdateLastSent: data.autoUpdateLastSent instanceof Timestamp ? data.autoUpdateLastSent.toDate().toISOString() : data.autoUpdateLastSent,
        autoUpdateNextSend: data.autoUpdateNextSend instanceof Timestamp ? data.autoUpdateNextSend.toDate().toISOString() : data.autoUpdateNextSend,
      } as Workflow);
    });
    return workflows;
  } catch (error) {
    console.error("Error fetching enabled workflows for CRON:", error);
    throw error;
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
      if (!workflow.autoUpdateEnabled || !workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail || !workflow.ownerId) {
        continue;
      }

      const nextSendDate = new Date(workflow.autoUpdateNextSend);
      if (now >= nextSendDate) {
        console.log(`Processing workflow: ${workflow.name} (ID: ${workflow.id}) for user ${workflow.ownerId}`);
        try {
          // Generate summary (needs tasks, so fetch them for this workflow and owner)
          // Note: generateClientProgressSummaryAction takes userId as first param.
          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId, // ownerId is the userId needed by the action
            workflow.id,
            workflow.name,
            "Automated Progress Update", // Generic client context
            `Covering progress up to ${now.toLocaleDateString()}` // Generic date context
          );

          if (summaryResult.summaryText.startsWith('Error:')) {
            console.error(`Error generating summary for workflow ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            // Optionally: Mark this workflow to try again later or notify admin
            await updateWorkflow(workflow.id, { autoUpdateNextSend: undefined }); // Clear next send to avoid retry loops without manual intervention if summary fails
            continue;
          }

          // Send email
          const emailResult = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail,
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
            // clientName: workflow.clientName (if available on workflow, otherwise AI might infer from tasks)
          });

          if (emailResult.success) {
            console.log(`Successfully sent update for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            // Record sent and update next send date
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency || 'weekly');
            updatesSentCount++;
          } else {
            console.error(`Failed to send email for workflow ${workflow.id}: ${emailResult.message}`);
            errorsCount++;
            // Optionally: Retry logic or error notification
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

// To protect this GET route, ensure it's not easily discoverable or use POST with a body if preferred.
// For Vercel, you can add cron job protection via vercel.json if deploying there.
// https://vercel.com/docs/cron-jobs/security#protecting-cron-jobs
// Or use the Bearer token method as implemented above.
