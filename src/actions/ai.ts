
// src/actions/ai.ts
'use server';

import { summarizeTask as runSummarizeTaskFlow, type TaskSummarizationInput, type TaskSummarizationOutput } from '@/ai/flows/task-summarization';
import { suggestSubtasks as runSuggestSubtasksFlow, type SubtaskSuggestionsInput, type SubtaskSuggestionsOutput } from '@/ai/flows/subtask-suggestions';
import { generateClientProgressSummary as runClientProgressSummaryFlow, type ClientProgressSummaryInput, type ClientProgressSummaryOutput } from '@/ai/flows/client-progress-summary-flow';
import { getTasksByWorkflow } from '@/services/taskService';
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
  userId: string, // Added userId
  workflowId: string,
  workflowName: string,
  clientContext?: string,
  dateRangeContext?: string
): Promise<ClientProgressSummaryOutput> {
  if (!userId) {
    return { summaryText: "Error: User authentication is required to generate summaries." };
  }
  try {
    const tasksFromDb = await getTasksByWorkflow(workflowId, userId); // Pass userId
    
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
      // ownerId is not directly needed by the AI prompt for summarization, but good to have in full task object
    }));

    const result = await runClientProgressSummaryFlow({
      workflowName,
      tasks: tasksForAI,
      clientContext: clientContext || "General progress update",
      dateRangeContext: dateRangeContext,
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
