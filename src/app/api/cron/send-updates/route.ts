// src/app/api/cron/send-updates/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { recordAutoUpdateSent } from '@/services/workflowService';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import { sendAutomatedClientUpdateEmailAction } from '@/actions/emailActions';
import type { Workflow } from '@/types';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic'; // Ensures the route is dynamic at runtime

const WORKFLOWS_COLLECTION = 'boards';

// Local helper to safely map Firestore timestamps
const mapTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  if (typeof timestampField === 'string') {
    try {
      new Date(timestampField).toISOString();
      return timestampField;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

async function getAllEnabledWorkflowsForCron(): Promise<Workflow[]> {
  try {
    if (!db) {
      console.error("Firestore 'db' is not available.");
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
          `Invalid workflow document. Skipping.`,
          { id: currentDocId, data }
        );
        return;
      }

      workflows.push({
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
      });
    });

    return workflows;
  } catch (error) {
    console.error("Error fetching workflows for CRON:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET_KEY;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error("Missing CRON_SECRET_KEY in environment.");
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("Unauthorized CRON request.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log("CRON: Starting automated updates job...");
  let updatesSentCount = 0;
  let errorsCount = 0;

  try {
    const workflows = await getAllEnabledWorkflowsForCron();
    const now = new Date();

      for (const workflow of workflows) {
        // Add this explicit check for undefined
        if (workflow === undefined) {
          console.error("Undefined workflow object encountered. Skipping.");
          errorsCount++;
          continue;
        }
  
        if (!workflow || typeof workflow !== 'object') {
          console.error("Invalid workflow object encountered:", workflow);
          errorsCount++;
          continue;
        }
  
        if (!workflow.id || !workflow.ownerId) {
          console.error("Workflow missing ID or ownerId:", workflow);
          errorsCount++;
          continue;
        }

      if (!workflow.autoUpdateEnabled || !workflow.autoUpdateNextSend || !workflow.autoUpdateClientEmail) {
        continue; // Skip if missing required fields
      }

      const nextSendDate = new Date(workflow.autoUpdateNextSend);
      if (now >= nextSendDate) {
        console.log(`Processing update for workflow: ${workflow.name} (ID: ${workflow.id})`);

        try {
          if (!workflow.name) {
            console.error(`Workflow ${workflow.id} is missing a name. Skipping.`);
            errorsCount++;
            continue;
          }

          const summaryResult = await generateClientProgressSummaryAction(
            workflow.ownerId,
            workflow.id,
            workflow.name,
            "Automated Progress Update",
            `Covering progress up to ${now.toLocaleDateString()}`
          );

          if (summaryResult.summaryText.startsWith('Error:')) {
            console.error(`Summary generation error for ${workflow.id}: ${summaryResult.summaryText}`);
            errorsCount++;
            continue;
          }

          const emailResult = await sendAutomatedClientUpdateEmailAction({
            toEmail: workflow.autoUpdateClientEmail,
            workflowName: workflow.name,
            summaryText: summaryResult.summaryText,
          });

          if (emailResult.success) {
            console.log(`Update sent for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
            await recordAutoUpdateSent(workflow.id, workflow.autoUpdateFrequency || 'weekly');
            updatesSentCount++;
          } else {
            console.error(`Email send failed for ${workflow.id}: ${emailResult.message}`);
            errorsCount++;
          }
        } catch (e) {
          console.error(`Error in processing workflow ${workflow.id}:`, e);
          errorsCount++;
        }
      }
    }

    console.log(`CRON completed. Sent: ${updatesSentCount}, Errors: ${errorsCount}`);
    return NextResponse.json({
      message: 'Automated updates processed.',
      updatesSent: updatesSentCount,
      errors: errorsCount,
    });

  } catch (error) {
    console.error('General CRON processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
