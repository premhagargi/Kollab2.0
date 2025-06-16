
// src/app/api/cron/send-updates/route.ts
import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore'; // For Firestore admin types if needed, or use client-side Timestamp
import { db } from '@/lib/firebase'; // Using client-side SDK for Next.js API routes
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Workflow, Task } from '@/types';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import { calculateNextSendDate, recordAutoUpdateSent } from '@/services/workflowService'; // Ensure recordAutoUpdateSent is exported and works with client SDK
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic'; // Ensures this route is always dynamic

// Helper to map Firestore Timestamps to ISO strings (client-side SDK version)
const mapClientTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) { // This will be firebase/firestore.Timestamp from client SDK
    return timestampField.toDate().toISOString();
  }
  if (timestampField && typeof timestampField.toDate === 'function') { // General check for Firestore-like timestamp objects
    return timestampField.toDate().toISOString();
  }
  if (typeof timestampField === 'string') { // If it's already an ISO string
    return timestampField;
  }
  return undefined;
};


const getAllEnabledWorkflowsForCron = async (): Promise<Workflow[]> => {
  const workflows: Workflow[] = [];
  if (!db) {
    console.error("[CRON API] Firestore DB not initialized in getAllEnabledWorkflowsForCron.");
    return workflows;
  }

  try {
    const q = query(
      collection(db, "boards"), // 'boards' is the collection name for workflows
      where('autoUpdateEnabled', '==', true)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Validate essential fields before constructing the Workflow object
      if (!docSnap.id || !data.ownerId || !data.name || !data.columns || typeof data.autoUpdateClientEmail !== 'string') {
        console.warn(`[CRON API] Skipping workflow document ${docSnap.id} due to missing essential fields or invalid autoUpdateClientEmail.`);
        return;
      }

      workflows.push({
        id: docSnap.id,
        name: data.name,
        ownerId: data.ownerId,
        columns: data.columns,
        template: data.template,
        createdAt: mapClientTimestampToISO(data.createdAt),
        updatedAt: mapClientTimestampToISO(data.updatedAt),
        autoUpdateEnabled: data.autoUpdateEnabled,
        autoUpdateFrequency: data.autoUpdateFrequency,
        autoUpdateClientEmail: data.autoUpdateClientEmail,
        autoUpdateLastSent: mapClientTimestampToISO(data.autoUpdateLastSent),
        autoUpdateNextSend: mapClientTimestampToISO(data.autoUpdateNextSend),
      } as Workflow);
    });
  } catch (error) {
    console.error("[CRON API] Error fetching workflows for CRON:", error);
  }
  return workflows;
};


export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET_KEY;

  if (!cronSecret) {
    console.error("[CRON API] CRON_SECRET_KEY is not set in environment variables.");
    return NextResponse.json({ message: 'CRON secret not configured on server.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CRON API] Unauthorized CRON job attempt.");
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  console.log("[CRON API] send-updates job started at:", new Date().toISOString());
  let updatesSentCount = 0;
  let errorsCount = 0;

  try {
    const workflows = await getAllEnabledWorkflowsForCron();
    console.log(`[CRON API] Found ${workflows.length} workflows enabled for auto-updates.`);

    const now = new Date();

    for (const workflow of workflows) {
       if (!workflow || !workflow.id || !workflow.ownerId || !workflow.name) {
        console.warn(`[CRON API] Invalid workflow object encountered, skipping. ID: ${workflow?.id}`);
        errorsCount++;
        continue;
      }
      
      if (!workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail || !workflow.autoUpdateFrequency) {
        console.warn(`[CRON API] Workflow ${workflow.id} is missing required auto-update fields (nextSend, clientEmail, or frequency). Skipping.`);
        continue;
      }

      let nextSendDate;
      try {
        nextSendDate = new Date(workflow.autoUpdateNextSend);
      } catch (e) {
        console.error(`[CRON API] Workflow ${workflow.id} has invalid autoUpdateNextSend date: ${workflow.autoUpdateNextSend}. Skipping. Error:`, e);
        errorsCount++;
        continue;
      }


      if (now >= nextSendDate) {
        console.log(`[CRON API] Processing update for workflow: ${workflow.name} (ID: ${workflow.id})`);

        try {
          // 1. Fetch tasks for this workflow (using client-side service)
          // Note: This might need adjustment if taskService requires auth that's not available here
          // For now, assuming generateClientProgressSummaryAction handles task fetching internally
          // via its own means or that ownerId is sufficient for context.
          
          // 2. Generate summary using Genkit (via Next.js Action)
          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId,
            workflow.id,
            workflow.name,
            "Automated Progress Update", // Client context
            `Covering progress up to ${now.toLocaleDateString()}` // Date range context
          );

          if (summaryResult.summaryText.startsWith("Error:")) {
            console.error(`[CRON API] Summary generation error for workflow ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            continue; // Skip this workflow if summary fails
          }

          // 3. Send email (via Next.js Action)
          const emailSent = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail,
            clientName: workflow.clientName || undefined, // Assuming workflow might have a clientName field
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
            workflowLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'app-url.com'}/workflow/${workflow.id}` // Example link
          });
          

          if (emailSent.success) {
            console.log(`[CRON API] Update sent for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            // 4. Record that the update was sent and calculate next send date
            // Using workflowService's recordAutoUpdateSent which should use client SDK
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency as ('weekly' | 'biweekly'));
            updatesSentCount++;
          } else {
            console.error(`[CRON API] Email send failed for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}: ${emailSent.message}`);
            errorsCount++;
          }
        } catch (e: any) {
          console.error(`[CRON API] Error during processing of workflow ${workflow.id}:`, e);
          errorsCount++;
        }
      }
    }
    const summaryMessage = `Automated updates job completed. Sent: ${updatesSentCount}, Errors: ${errorsCount}`;
    console.log(`[CRON API] ${summaryMessage}`);
    return NextResponse.json({ message: summaryMessage });
  } catch (error: any) {
    console.error("[CRON API] General error in send-updates job:", error);
    return NextResponse.json({ message: 'CRON job failed', error: error.message || 'Unknown error' }, { status: 500 });
  }
}
