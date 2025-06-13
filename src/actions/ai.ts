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
    // console.log("Calling summarizeTask flow with input:", input);
    const result = await runSummarizeTaskFlow(input);
    // console.log("summarizeTask flow result:", result);
    if (!result || typeof result.summary !== 'string') {
      throw new Error('Invalid summary format from AI');
    }
    return result;
  } catch (error) {
    // console.error("Error in summarizeTaskAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating summary.";
    return { summary: `Error: ${errorMessage}` };
  }
}

export async function suggestSubtasksAction(input: SubtaskSuggestionsInput): Promise<SubtaskSuggestionsOutput> {
  try {
    // console.log("Calling suggestSubtasks flow with input:", input);
    const result = await runSuggestSubtasksFlow(input);
    // console.log("suggestSubtasks flow result:", result);
     if (!result || !Array.isArray(result.subtaskSuggestions)) {
      throw new Error('Invalid subtask suggestions format from AI');
    }
    return result;
  } catch (error) {
    // console.error("Error in suggestSubtasksAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating subtasks.";
    return { subtaskSuggestions: [`Error: ${errorMessage}`] };
  }
}

export async function generateClientProgressSummaryAction(
  userId: string, 
  workflowId: string,
  workflowName: string,
  clientContext?: string,
  dateRangeContext?: string
): Promise<ClientProgressSummaryOutput> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    console.error("[aiAction] generateClientProgressSummaryAction: Invalid userId provided.", { userId });
    return { summaryText: "Error: User authentication is required to generate summaries. Invalid user ID." };
  }
  if (!workflowId || typeof workflowId !== 'string' || workflowId.trim() === '') {
    console.error("[aiAction] generateClientProgressSummaryAction: Invalid workflowId provided.", { workflowId });
    return { summaryText: "Error: Workflow information is missing. Invalid workflow ID." };
  }

  try {
    console.log(`[aiAction] generateClientProgressSummaryAction: Starting summary generation for workflowId='${workflowId}', userId='${userId}'`);
    
    // First verify workflow ownership
    const workflow = await getWorkflowById(workflowId);
    if (!workflow) {
      console.error(`[aiAction] generateClientProgressSummaryAction: Workflow not found. workflowId='${workflowId}'`);
      return { summaryText: "Error: Workflow not found." };
    }
    if (workflow.ownerId !== userId) {
      console.error(`[aiAction] generateClientProgressSummaryAction: User does not own this workflow. workflowId='${workflowId}', userId='${userId}', workflowOwnerId='${workflow.ownerId}'`);
      return { summaryText: "Error: You don't have permission to generate summaries for this workflow." };
    }

    console.log(`[aiAction] generateClientProgressSummaryAction: Fetching tasks for workflowId='${workflowId}', userId='${userId}'`);
    const tasksFromDb = await getTasksByWorkflow(workflowId, userId); 
    
    console.log(`[aiAction] generateClientProgressSummaryAction: Retrieved ${tasksFromDb.length} tasks`);
    
    const tasksForAI: ClientProgressSummaryInput['tasks'] = tasksFromDb.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt,
      isCompleted: task.isCompleted,
      columnId: task.columnId, 
      clientName: task.clientName, 
      isBillable: task.isBillable,
    }));

    console.log(`[aiAction] generateClientProgressSummaryAction: Generating summary with ${tasksForAI.length} tasks`);
    const result = await runClientProgressSummaryFlow({
      workflowName,
      tasks: tasksForAI,
      clientContext: clientContext || "General progress update",
      dateRangeContext: dateRangeContext,
    });

    if (!result || typeof result.summaryText !== 'string') {
      console.error(`[aiAction] generateClientProgressSummaryAction: Invalid summary format from AI. workflowId='${workflowId}'`);
      throw new Error('Invalid summary format from AI for client update.');
    }
    console.log(`[aiAction] generateClientProgressSummaryAction: Successfully generated summary for workflowId='${workflowId}'`);
    return result;
  } catch (error) {
    console.error(`[aiAction] Error in generateClientProgressSummaryAction for workflowId='${workflowId}', userId='${userId}':`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error generating client progress summary.";
    return { summaryText: `Error: ${errorMessage}` };
  }
}
