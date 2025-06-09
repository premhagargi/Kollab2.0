// 'use server'
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating subtask suggestions for a given task.
 *
 * It exports:
 *   - `suggestSubtasks`: A function that takes a task description and returns subtask suggestions.
 *   - `SubtaskSuggestionsInput`: The input type for the `suggestSubtasks` function.
 *   - `SubtaskSuggestionsOutput`: The output type for the `suggestSubtasks` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the subtask suggestion flow.
const SubtaskSuggestionsInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task for which to generate subtasks.'),
});

export type SubtaskSuggestionsInput = z.infer<typeof SubtaskSuggestionsInputSchema>;

// Define the output schema for the subtask suggestion flow.
const SubtaskSuggestionsOutputSchema = z.object({
  subtaskSuggestions: z
    .array(z.string())
    .describe('An array of suggested subtasks for the given task.'),
});

export type SubtaskSuggestionsOutput = z.infer<typeof SubtaskSuggestionsOutputSchema>;

// Define the main function that calls the subtask suggestion flow.
export async function suggestSubtasks(input: SubtaskSuggestionsInput): Promise<SubtaskSuggestionsOutput> {
  return subtaskSuggestionsFlow(input);
}

// Define the prompt for generating subtask suggestions.
const subtaskSuggestionsPrompt = ai.definePrompt({
  name: 'subtaskSuggestionsPrompt',
  input: {schema: SubtaskSuggestionsInputSchema},
  output: {schema: SubtaskSuggestionsOutputSchema},
  prompt: `You are an AI assistant that suggests subtasks for a given task.

  Given the following task description, suggest a list of subtasks that need to be completed to finish the main task.

  Task Description: {{{taskDescription}}}

  Subtask Suggestions:`,
});

// Define the Genkit flow for generating subtask suggestions.
const subtaskSuggestionsFlow = ai.defineFlow(
  {
    name: 'subtaskSuggestionsFlow',
    inputSchema: SubtaskSuggestionsInputSchema,
    outputSchema: SubtaskSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await subtaskSuggestionsPrompt(input);
    return output!;
  }
);
