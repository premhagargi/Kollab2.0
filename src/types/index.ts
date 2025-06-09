export interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  // teamMemberIds: string[]; // Simplified for now
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  columns: Column[];
  tasks: Task[]; // Tasks are stored within the board object for simplicity in mock data
}

export interface Column {
  id: string;
  name: string;
  taskIds: string[]; // Ordered list of task IDs in this column
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id:string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO string
  assigneeIds?: string[];
  subtasks: Subtask[];
  comments: Comment[];
  // attachments: Attachment[]; // Future feature
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  userId: string; // Refers to UserProfile.id
  userName: string; // Denormalized for display
  userAvatarUrl?: string; // Denormalized for display
  text: string;
  createdAt: string; // ISO string
}

// Minimal TeamMember for invite modal, can be expanded later
export interface TeamMemberInvite {
  email: string;
  role: 'editor' | 'viewer';
}

// For AI responses
export interface AISummary {
  summary: string;
}

export interface AISubtaskSuggestion {
  id: string; // Temporary ID for UI
  text: string;
}
