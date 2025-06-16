
// src/actions/ai.ts
'use server';

import { summarizeTask as runSummarizeTaskFlow, type TaskSummarizationInput, type TaskSummarizationOutput } from '@/ai/flows/task-summarization';
import { suggestSubtasks as runSuggestSubtasksFlow, type SubtaskSuggestionsInput, type SubtaskSuggestionsOutput } from '@/ai/flows/subtask-suggestions';
import { generateClientProgressSummary as runClientProgressSummaryFlow, type ClientProgressSummaryInput, type ClientProgressSummaryOutput } from '@/ai/flows/client-progress-summary-flow';
import { getTasksByWorkflow } from '@/services/taskService';
import { getWorkflowById } from '@/services/workflowService';
import type { Task } from '@/types';

export async function summarizeTaskAction(input: TaskSummarizationInput): Promise<TaskSummarizationOutput> {
  try {
    const result = await runSummarizeTaskFlow(input);
    if (!result || typeof result.summary !== 'string') {
      throw new Error('Invalid summary format from AI');
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating summary.";
    return { summary: `Error: ${errorMessage}` };
  }
}

export async function suggestSubtasksAction(input: SubtaskSuggestionsInput): Promise<SubtaskSuggestionsOutput> {
  try {
    const result = await runSuggestSubtasksFlow(input);
     if (!result || !Array.isArray(result.subtaskSuggestions)) {
      throw new Error('Invalid subtask suggestions format from AI');
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating subtasks.";
    return { subtaskSuggestions: [`Error: ${errorMessage}`] };
  }
}

export async function generateClientProgressSummaryAction(
  userId: string,
  workflowId: string,
  workflowName: string, // This can be directly from the workflow object
  clientContext?: string,
  dateRangeContext?: string
): Promise<ClientProgressSummaryOutput> {

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return { summaryText: "Error: User authentication is required to generate summaries. Invalid user ID." };
  }
  if (!workflowId || typeof workflowId !== 'string' || workflowId.trim() === '') {
    return { summaryText: "Error: Workflow information is missing. Invalid workflow ID." };
  }
   if (!workflowName || typeof workflowName !== 'string' || workflowName.trim() === '') {
    return { summaryText: "Error: Workflow name is missing." };
  }

  try {
    const workflow = await getWorkflowById(workflowId);
    if (!workflow) {
      return { summaryText: "Error: Workflow not found." };
    }
    if (workflow.ownerId !== userId) {
      return { summaryText: "Error: You don't have permission to generate summaries for this workflow." };
    }

    const tasksFromDb = await getTasksByWorkflow(workflowId, userId);

    const tasksForAI: ClientProgressSummaryInput['tasks'] = tasksFromDb.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt,
      isCompleted: task.isCompleted,
      columnId: task.columnId,
      // clientName removed from task, it's on workflow
      isBillable: task.isBillable,
    }));

    const result = await runClientProgressSummaryFlow({
      workflowName: workflow.name, // Use name from fetched workflow
      tasks: tasksForAI,
      clientContext: clientContext || "General progress update",
      dateRangeContext: dateRangeContext,
      workflowClientName: workflow.clientName, // Pass workflow-level client name
    });

    if (!result || typeof result.summaryText !== 'string') {
      throw new Error('Invalid summary format from AI for client update.');
    }
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating client progress summary.";
    return { summaryText: `Error: ${errorMessage}` };
  }
}
