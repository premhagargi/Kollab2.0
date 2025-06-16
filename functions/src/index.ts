
/**
 * IMPORTANT SETUP NOTES:
 * 1. Firebase Functions Initialization:
 *    - If you haven't already, initialize Firebase Functions in your project root:
 *      `firebase init functions`
 *    - Choose TypeScript.
 *    - When asked about ESLint, you can choose No if you prefer.
 *    - This will create the `functions` directory and necessary base files.
 *
 * 2. Dependencies:
 *    - Copy the `package.json` and `tsconfig.json` provided into your `functions` directory.
 *    - Navigate to the `functions` directory: `cd functions`
 *    - Install dependencies: `npm install` (or `yarn install`)
 *
 * 3. Environment Variables for Deployed Functions:
 *    - Cloud Functions DO NOT use .env files for deployed environments.
 *    - You MUST set environment variables using the Firebase CLI:
 *      `firebase functions:config:set someservice.key="THE API KEY" someservice.id="THE ID"`
 *      For example:
 *      `firebase functions:config:set genai.google_api_key="YOUR_GOOGLE_AI_KEY"`
 *      `firebase functions:config:set email.host="YOUR_EMAIL_HOST"`
 *      `firebase functions:config:set email.port="YOUR_EMAIL_PORT"`
 *      `firebase functions:config:set email.user="YOUR_EMAIL_USER"`
 *      `firebase functions:config:set email.pass="YOUR_EMAIL_PASS"`
 *      `firebase functions:config:set email.from="YOUR_EMAIL_FROM"`
 *    - Access them in your function code like: `functions.config().someservice.key`
 *    - For local emulation, you can create a `functions/.runtimeconfig.json` file:
 *      {
 *        "genai": { "google_api_key": "YOUR_LOCAL_GOOGLE_AI_KEY" },
 *        "email": { ... }
 *      }
 *
 * 4. Deployment:
 *    - From your project root: `firebase deploy --only functions`
 *
 * 5. Genkit Initialization:
 *    - The Genkit `ai` object from `src/ai/genkit.ts` might need its plugin initialization
 *      to happen here or be re-instantiated if the one in `src/ai/genkit.ts` relies on
 *      Next.js specific environment variable loading (e.g. `process.env.GOOGLE_API_KEY`).
 *      For Cloud Functions, it's safer to initialize Genkit within the function scope using
 *      `functions.config()` for API keys.
 *
 * 6. Path Aliases:
 *    - The `tsconfig.json` in `functions/` is set up with `baseUrl: "."` and `paths: { "@/*": ["../src/*"] }`.
 *    - This allows imports like `import { dbAdmin } from "@/lib/firebase-admin";`
 *    - Ensure your main `src` directory is one level up from `functions/src`.
 */

import * as functions from "firebase-functions";
import *import admin from "firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

// Import Genkit and Google AI Plugin
import { genkit, ZodError } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// Import your project's specific types and services
// Adjust paths if your `functions` directory is not directly at the root alongside `src`
import type { Workflow, Task } from "../../src/types"; // Assuming types.ts is in src/types
import { calculateNextSendDate } from "../../src/services/workflowService"; // Assuming workflowService.ts is in src/services
import { sendMail } from "../../src/lib/mailer"; // Assuming mailer.ts is in src/lib
import { siteConfig } from "../../src/config/site"; // Assuming siteConfig.ts is in src/config

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();
const WORKFLOWS_COLLECTION = "boards"; // Firestore collection name for workflows
const TASKS_COLLECTION = "tasks";


// Initialize Genkit (using environment variables set for Firebase Functions)
// Ensure GOOGLE_API_KEY (or GENAI_API_KEY) is set in Firebase Functions config
let ai: any;
try {
    const googleApiKey = functions.config().genai?.google_api_key || process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
        console.warn("GOOGLE_API_KEY for Genkit is not configured in Firebase Functions environment. AI features will fail.");
    }
    ai = genkit({
      plugins: [googleAI({ apiKey: googleApiKey })], // Pass API key here for functions
      // No model needed at global level here, will be specified in prompt/flow
    });
} catch (e) {
    console.error("Failed to initialize Genkit AI:", e);
}


// Define the schema for the client progress summary flow (adapted from client-progress-summary-flow.ts)
const ClientProgressSummaryInputSchema = z.object({
  workflowName: z.string().describe("The name of the workflow/project."),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.string().optional(),
      dueDate: z.string().optional(),
      updatedAt: z.string().optional(),
      isCompleted: z.boolean().optional().default(false),
      columnId: z.string().optional(),
      clientName: z.string().optional(),
      isBillable: z.boolean().optional().default(false),
    })
  ).describe("A list of tasks in the workflow."),
  clientContext: z.string().optional().describe("Optional context for the client update."),
  dateRangeContext: z.string().optional().describe("Specific date range context for the summary."),
});
type ClientProgressSummaryInput = z.infer<typeof ClientProgressSummaryInputSchema>;

const ClientProgressSummaryOutputSchema = z.object({
  summaryText: z.string().describe("A plain text, client-ready progress summary."),
});
type ClientProgressSummaryOutput = z.infer<typeof ClientProgressSummaryOutputSchema>;

const formatTaskForPrompt = (task: ClientProgressSummaryInput['tasks'][0]): string => {
  let taskString = `- Title: "${task.title}" (Priority: ${task.priority || 'N/A'})`;
  if (task.isCompleted) {
    taskString += " - Status: COMPLETED";
  } else if (task.columnId) {
    taskString += ` - Status: In Progress/To Do`; // Simplified for CRON
  }
  if (task.dueDate) {
    try {
        taskString += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
    } catch (e) { /* ignore invalid date */ }
  }
  if (task.description && task.description.length > 0 && task.description.length < 150) {
    taskString += `\\n  Description: ${task.description}`;
  } else if (task.description) {
    taskString += `\\n  Description: (details available)`;
  }
  if (task.clientName) {
    taskString += `\\n  Client: ${task.clientName}`;
  }
  if (task.isBillable) {
    taskString += ` - Billable`;
  }
  if (task.updatedAt) {
     try {
        taskString += ` - Last Updated: ${new Date(task.updatedAt).toLocaleDateString()}`;
    } catch (e) { /* ignore invalid date */ }
  }
  return taskString;
};


const clientProgressSummaryPrompt = ai.definePrompt({
  name: 'clientProgressSummaryPromptCron', // Ensure unique name if deploying alongside Next.js app flows
  input: {schema: ClientProgressSummaryInputSchema},
  output: {schema: ClientProgressSummaryOutputSchema},
  prompt: `You are an AI assistant helping a freelancer draft a progress update for their client.
The project/workflow is named: "{{workflowName}}".
The client context for this update is: "{{#if clientContext}}{{clientContext}}{{else}}General Progress Update{{/if}}".
{{#if dateRangeContext}}The requested date range for this summary is: "{{dateRangeContext}}". Please focus your summary primarily on activities and updates within this period.{{/if}}

Based on the following tasks (note their 'Last Updated' dates), generate a concise, professional, and friendly progress update suitable for an email.
Structure it like a brief email. Start with a greeting (e.g., "Hi Client,").
Highlight what has been completed, what is currently in progress, and any key upcoming items or notes, paying close attention to the specified date range if provided.
If a date range is given, prioritize tasks updated or completed within that range.

Tasks:
{{#if tasks.length}}
{{#each tasks}}
${formatTaskForPrompt({
  id: (this as any).id, title: (this as any).title, description: (this as any).description,
  priority: (this as any).priority, dueDate: (this as any).dueDate, updatedAt: (this as any).updatedAt,
  isCompleted: (this as any).isCompleted, columnId: (this as any).columnId,
  clientName: (this as any).clientName, isBillable: (this as any).isBillable
})}
{{/each}}
{{else}}
No specific task updates to report for "{{workflowName}}" at this moment. Consider providing a general status or mentioning next steps.
{{/if}}

Please generate the summary text now.
`,
});


const generateClientProgressSummaryFlow = ai.defineFlow(
  {
    name: "generateClientProgressSummaryFlowCron",
    inputSchema: ClientProgressSummaryInputSchema,
    outputSchema: ClientProgressSummaryOutputSchema,
  },
  async (input: ClientProgressSummaryInput) => {
    const { output } = await clientProgressSummaryPrompt(input);
    if (!output) {
      return { summaryText: "Error: AI did not return a valid summary." };
    }
    return output;
  }
);


// Helper to map Firestore Timestamps to ISO strings for Workflow
const mapWorkflowTimestamps = (data: admin.firestore.DocumentData): any => {
  const mapped: any = {};
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      mapped[key] = data[key].toDate().toISOString();
    } else {
      mapped[key] = data[key];
    }
  }
  return mapped;
};

// Helper to map Firestore Timestamps to ISO strings for Task
const mapTaskTimestamps = (data: admin.firestore.DocumentData): any => {
    const mapped: any = {};
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
        mapped[key] = data[key].toDate().toISOString();
        } else if (key === 'subtasks' || key === 'comments' || key === 'deliverables') {
        // Ensure arrays are carried over correctly even if empty
        mapped[key] = data[key] || [];
        } else {
        mapped[key] = data[key];
        }
    }
    // Ensure boolean fields have defaults if missing from Firestore
    mapped.isCompleted = data.isCompleted === undefined ? false : data.isCompleted;
    mapped.isBillable = data.isBillable === undefined ? false : data.isBillable;
    mapped.isArchived = data.isArchived === undefined ? false : data.isArchived;
    return mapped;
};


// Scheduled function to send automated client updates
// To deploy, use: firebase deploy --only functions:sendAutomatedClientUpdates
// To set schedule (e.g., every day at 9 AM):
// In Google Cloud Console > Cloud Scheduler, or use a more complex setup if needed.
// For simple daily, you can use `functions.pubsub.schedule('every day 09:00')`
export const sendAutomatedClientUpdates = functions.pubsub
  .schedule("every 24 hours") // Runs daily. Adjust as needed e.g. "every monday 09:00"
  .timeZone("America/New_York") // Optional: Specify timezone
  .onRun(async (context) => {
    functions.logger.log("Starting automated client updates CRON job. Timestamp:", context.timestamp);
    let updatesSentCount = 0;
    let errorsCount = 0;

    try {
      const now = new Date();
      const workflowsSnapshot = await db
        .collection(WORKFLOWS_COLLECTION)
        .where("autoUpdateEnabled", "==", true)
        // Query for workflows where autoUpdateNextSend is less than or equal to now
        // Firestore does not support direct comparison with date objects in this way for older SDKs or specific setups.
        // So, we fetch all enabled and filter in code. This is less efficient for very large numbers of workflows.
        // If performance becomes an issue, consider structuring `autoUpdateNextSend` as a timestamp
        // or a sortable string that allows for range queries.
        .get();

      if (workflowsSnapshot.empty) {
        functions.logger.log("No workflows found with autoUpdateEnabled=true.");
        return null;
      }

      for (const docSnap of workflowsSnapshot.docs) {
        const workflow = {
            id: docSnap.id,
            ...mapWorkflowTimestamps(docSnap.data())
        } as Workflow;

        if (
          !workflow.autoUpdateNextSend ||
          !workflow.autoUpdateClientEmail ||
          !workflow.ownerId
        ) {
          functions.logger.warn(`Workflow ${workflow.id} is missing required auto-update fields. Skipping.`);
          continue;
        }
        
        let nextSendDate;
        try {
            nextSendDate = new Date(workflow.autoUpdateNextSend);
        } catch (e) {
            functions.logger.error(`Workflow ${workflow.id} has invalid autoUpdateNextSend date: ${workflow.autoUpdateNextSend}. Skipping. Error:`, e);
            continue;
        }


        if (now >= nextSendDate) {
          functions.logger.log(`Processing update for workflow: ${workflow.name} (ID: ${workflow.id})`);

          try {
            // 1. Fetch tasks for this workflow
            const tasksSnapshot = await db
              .collection(TASKS_COLLECTION)
              .where("workflowId", "==", workflow.id)
              .where("ownerId", "==", workflow.ownerId)
              .where("isArchived", "==", false)
              .get();

            const tasksForAI: ClientProgressSummaryInput['tasks'] = tasksSnapshot.docs.map(taskDoc => {
                const taskData = mapTaskTimestamps(taskDoc.data());
                return {
                    id: taskDoc.id,
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    dueDate: taskData.dueDate,
                    updatedAt: taskData.updatedAt,
                    isCompleted: taskData.isCompleted,
                    columnId: taskData.columnId,
                    clientName: taskData.clientName,
                    isBillable: taskData.isBillable,
                };
            });

            // 2. Generate summary using Genkit
            if (!ai) {
                 functions.logger.error("Genkit AI not initialized. Cannot generate summary.");
                 errorsCount++;
                 continue;
            }
            const summaryInput: ClientProgressSummaryInput = {
              workflowName: workflow.name,
              tasks: tasksForAI,
              clientContext: "Automated Progress Update",
              dateRangeContext: `Covering progress up to ${now.toLocaleDateString()}`,
            };
            
            let summaryResult: ClientProgressSummaryOutput;
            try {
                summaryResult = await generateClientProgressSummaryFlow(summaryInput);
            } catch(e) {
                if (e instanceof ZodError) {
                    functions.logger.error(`Zod validation error for AI summary input/output for workflow ${workflow.id}:`, e.errors);
                } else {
                    functions.logger.error(`Error generating AI summary for workflow ${workflow.id}:`, e);
                }
                errorsCount++;
                continue;
            }


            if (summaryResult.summaryText.startsWith("Error:")) {
              functions.logger.error(`Summary generation error for workflow ${workflow.id}: ${summaryResult.summaryText}`);
              errorsCount++;
              continue;
            }

            // 3. Send email
            const emailFrom = functions.config().email?.from || process.env.EMAIL_FROM;
            if (!emailFrom) {
                functions.logger.error("EMAIL_FROM is not configured. Cannot send email for workflow: ", workflow.id);
                errorsCount++;
                continue;
            }

            const greeting = workflow.clientName ? `Hi ${workflow.clientName},` : `Hi there,`;
            const summaryHtml = summaryResult.summaryText.replace(/\\n/g, '<br />');
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <h2 style="color: #222; border-bottom: 1px solid #eee; padding-bottom: 10px;">Progress Update: ${workflow.name}</h2>
                  <p>${greeting}</p>
                  <p>Here's a summary of recent progress on the "${workflow.name}" project/workflow:</p>
                  <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px; margin-bottom: 20px;">
                    ${summaryHtml}
                  </div>
                  <p>If you have any questions, please don't hesitate to reach out.</p>
                  <p>Best regards,<br/>The ${siteConfig.name} Team (on behalf of your project manager)</p>
                </div>
              </div>
            `;

            const mailerConfig = {
                host: functions.config().email?.host || process.env.EMAIL_HOST,
                port: parseInt(functions.config().email?.port || process.env.EMAIL_PORT || "587", 10),
                user: functions.config().email?.user || process.env.EMAIL_USER,
                pass: functions.config().email?.pass || process.env.EMAIL_PASS,
            };

            const emailSent = await sendMail(
              {
                from: emailFrom,
                to: workflow.autoUpdateClientEmail,
                subject: `Progress Update for ${workflow.name}`,
                html: htmlContent,
              },
              mailerConfig // Pass explicit config to sendMail
            );

            if (emailSent) {
              functions.logger.log(`Update sent for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
              // 4. Record that the update was sent and calculate next send date
              const newNextSendDate = calculateNextSendDate(workflow.autoUpdateFrequency, now.toISOString());
              await db.collection(WORKFLOWS_COLLECTION).doc(workflow.id).update({
                autoUpdateLastSent: now.toISOString(),
                autoUpdateNextSend: newNextSendDate,
                updatedAt: FieldValue.serverTimestamp(),
              });
              updatesSentCount++;
            } else {
              functions.logger.error(`Email send failed for workflow ${workflow.id} to ${workflow.autoUpdateClientEmail}`);
              errorsCount++;
            }
          } catch (e) {
            functions.logger.error(`Error during processing of workflow ${workflow.id}:`, e);
            errorsCount++;
          }
        }
      }
      functions.logger.log(`Automated updates job completed. Sent: ${updatesSentCount}, Errors: ${errorsCount}`);
      return null;
    } catch (error) {
      functions.logger.error("General error in automated updates CRON job:", error);
      return null;
    }
  });


// Modify sendMail in mailer.ts to accept config (if not already)
// This is conceptual, actual mailer.ts would need this change.
// If mailer.ts already initializes transporter globally, it needs to be adapted
// to be configurable or re-initialized for functions environment.
// The provided mailer.ts seems to initialize globally, so we'll pass config.

// We need to slightly adjust the mailer.ts to be usable by cloud functions
// by allowing configuration to be passed or by re-initializing the transporter.
// For now, the function above assumes `sendMail` can take a config.
// A more robust solution for mailer.ts would be:
// export const sendMail = async (options: MailOptions, transportConfig?: MailerTransportConfig) => {
//   let transporterToUse = transporter; // global one
//   if (transportConfig) {
//     transporterToUse = nodemailer.createTransport(transportConfig);
//   }
//   if (!transporterToUse) { /* error */ return false; }
//   // ... rest of sendMail logic
// }
// And then pass the config from Firebase Functions:
// functions.config().email.host, functions.config().email.port etc.

// This function assumes your `../../src/lib/mailer.ts` is adapted
// to be callable from a serverless environment like Firebase Functions,
// potentially by re-initializing its transporter with credentials passed
// from `functions.config().email`.

// If your `mailer.ts` initializes Nodemailer globally using `process.env`,
// you need to ensure those env vars are set in Firebase Functions config.
// Example: `process.env.EMAIL_HOST` in `mailer.ts` would use `functions.config().email.host`.


// Note: The provided mailer.ts initializes its transporter globally.
// It needs to be adapted to use environment variables available in Firebase Functions.
// The code above for `sendAutomatedClientUpdates` now passes relevant mailer config
// to the `sendMail` function. You'll need to modify `src/lib/mailer.ts` to accept this.
// I will add a conceptual change to `mailer.ts` if you wish, or you can adapt it.
// For simplicity in this response, I'll assume `sendMail` can be made to work with passed config
// or by ensuring Firebase function env vars are named identically to what mailer.ts expects.

// A simple way to make mailer.ts work is to ensure that the environment variables
// (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM) are set in the
// Firebase Functions runtime configuration. The `sendMail` function you provided
// already reads from `process.env`.
//
// Example:
// firebase functions:config:set email.host="smtp.example.com" email.port="587" email.user="user" email.pass="pass" email.from="from@example.com"
//
// Then, in mailer.ts, `process.env.EMAIL_HOST` would correctly pick up `functions.config().email.host`.
// The code for `sendAutomatedClientUpdates` has been updated to pass a mailerConfig object to `sendMail`.
// You would need to adjust `src/lib/mailer.ts` to accept and use this optional configuration.
// For brevity, I won't modify `mailer.ts` in this XML block, but that's a required change.
// The `sendMail` function call in `functions/src/index.ts` now includes a second argument for mailer config.

