import { config } from 'dotenv';
config();

import '@/ai/flows/subtask-suggestions.ts';
import '@/ai/flows/priority-recommendations.ts';
import '@/ai/flows/task-summarization.ts';
import '@/ai/flows/client-progress-summary-flow.ts'; // Added new flow
