
'use server';
/**
 * @fileOverview Generates a client-ready progress summary for a workflow.
 *
 * - generateClientProgressSummary - A function that takes workflow details and tasks, and returns a summary.
 * - ClientProgressSummaryInput - The input type.
 * - ClientProgressSummaryOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Task } from '@/types'; // Assuming Task type is available

// Helper to format tasks for the prompt
const formatTaskForPrompt = (task: Task): string => {
  let taskString = `- Title: "${task.title}" (Priority: ${task.priority || 'N/A'})`;
  if (task.isCompleted) {
    taskString += " - Status: COMPLETED";
  } else if (task.columnId) {
    // We might not have column names here, so we'll use a generic "In Progress" or "To Do"
    // For a more detailed status, the calling action would need to resolve column names.
    taskString += ` - Status: In Progress/To Do (Column ID: ${task.columnId})`;
  }
  if (task.dueDate) {
    taskString += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
  }
  if (task.description && task.description.length > 0 && task.description.length < 150) { // Include short descriptions
    taskString += `\n  Description: ${task.description}`;
  } else if (task.description) {
    taskString += `\n  Description: (details available)`;
  }
  if (task.clientName) {
    taskString += `\n  Client: ${task.clientName}`;
  }
  if (task.isBillable) {
    taskString += ` - Billable`;
  }
  // Include last updated date for AI context
  if (task.updatedAt) {
    taskString += ` - Last Updated: ${new Date(task.updatedAt).toLocaleDateString()}`;
  }
  return taskString;
};


const ClientProgressSummaryInputSchema = z.object({
  workflowName: z.string().describe('The name of the workflow/project.'),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.string().optional(), // Assuming TaskPriority is a string union
      dueDate: z.string().optional(),
      updatedAt: z.string().optional(), // Added for date context
      isCompleted: z.boolean().optional().default(false),
      columnId: z.string().optional(), // To infer status if not explicitly completed
      clientName: z.string().optional(),
      isBillable: z.boolean().optional().default(false),
    })
  ).describe('A list of tasks in the workflow.'),
   clientContext: z.string().optional().describe('Optional context for the client update, e.g., "weekly update", "project milestone". Default to general progress.'),
   dateRangeContext: z.string().optional().describe('Specific date range context for the summary, e.g., "this week", "tasks completed from June 1st to June 7th".'),
});
export type ClientProgressSummaryInput = z.infer<typeof ClientProgressSummaryInputSchema>;

const ClientProgressSummaryOutputSchema = z.object({
  summaryText: z.string().describe('A plain text, client-ready progress summary email or update. Should be professional and concise.'),
});
export type ClientProgressSummaryOutput = z.infer<typeof ClientProgressSummaryOutputSchema>;


export async function generateClientProgressSummary(input: ClientProgressSummaryInput): Promise<ClientProgressSummaryOutput> {
  return clientProgressSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clientProgressSummaryPrompt',
  input: {schema: ClientProgressSummaryInputSchema},
  output: {schema: ClientProgressSummaryOutputSchema},
  prompt: `You are an AI assistant helping a freelancer draft a progress update for their client.
The project/workflow is named: "{{workflowName}}".
The client context for this update is: "{{#if clientContext}}{{clientContext}}{{else}}General Progress Update{{/if}}".
{{#if dateRangeContext}}The requested date range for this summary is: "{{dateRangeContext}}". Please focus your summary primarily on activities and updates within this period.{{/if}}

Based on the following tasks (note their 'Last Updated' dates), generate a concise, professional, and friendly progress update suitable for an email.
Structure it like a brief email. Start with a greeting (e.g., "Hi [Client Name]," - use a placeholder if client name isn't directly available from tasks).
Highlight what has been completed, what is currently in progress, and any key upcoming items or notes, paying close attention to the specified date range if provided.
If a date range is given, prioritize tasks updated or completed within that range.

Tasks:
{{#if tasks.length}}
{{#each tasks}}
${formatTaskForPrompt({
  // Cast 'this' to the expected Task structure for the helper
  // This is a trick as Handlebars doesn't have typed contexts directly.
  // The actual Task type is defined in ClientProgressSummaryInputSchema for Zod validation.
  id: (this as any).id,
  title: (this as any).title,
  description: (this as any).description,
  priority: (this as any).priority,
  dueDate: (this as any).dueDate,
  updatedAt: (this as any).updatedAt,
  isCompleted: (this as any).isCompleted,
  columnId: (this as any).columnId,
  clientName: (this as any).clientName,
  isBillable: (this as any).isBillable,
  // Add other required fields for Task if formatTaskForPrompt uses them
  subtasks: [], comments: [], createdAt: '', workflowId: '', creatorId: ''
})}
{{/each}}
{{else}}
No specific task updates to report for "{{workflowName}}" at this moment. Consider providing a general status or mentioning next steps.
{{/if}}

Please generate the summary text now.
`,
});


const clientProgressSummaryFlow = ai.defineFlow(
  {
    name: 'clientProgressSummaryFlow',
    inputSchema: ClientProgressSummaryInputSchema,
    outputSchema: ClientProgressSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        return { summaryText: "Error: AI did not return a valid summary." };
    }
    return output;
  }
);

