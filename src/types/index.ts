
export interface UserProfile {
  id: string; // UID from Firebase Auth
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt?: string; // ISO string, from Firestore serverTimestamp
  updatedAt?: string; // ISO string, from Firestore serverTimestamp
  // Add any other custom fields you want to store for a user
  // e.g., bio?: string; preferences?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string; // UserProfile.id
  // teamMemberIds: string[]; // Array of UserProfile.id
}

export interface Board {
  id: string;
  workspaceId: string; // Workspace.id
  name: string;
  columns: Column[];
  tasks: Task[]; // Tasks are stored within the board object for simplicity in mock data for now
                // In a real Firestore setup, tasks might be a subcollection or a separate top-level collection.
  ownerId?: string; // UserProfile.id - who created the board
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
  assigneeIds?: string[]; // Array of UserProfile.id
  subtasks: Subtask[];
  comments: Comment[];
  // attachments: Attachment[]; // Future feature
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  boardId?: string; // Board.id - which board this task belongs to
  columnId?: string; // Column.id - which column this task is in
  creatorId?: string; // UserProfile.id - who created the task
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
  userAvatarUrl?: string | null; // Denormalized for display
  text: string;
  createdAt: string; // ISO string
}

export interface TeamMemberInvite {
  email: string;
  role: 'editor' | 'viewer';
}

export interface AISummary {
  summary: string;
}

export interface AISubtaskSuggestion {
  id: string; 
  text: string;
}
