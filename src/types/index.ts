
export interface UserProfile {
  id: string; // UID from Firebase Auth
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  createdAt?: string; // ISO string, from Firestore serverTimestamp
  updatedAt?: string; // ISO string, from Firestore serverTimestamp
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string; // UserProfile.id
}

export interface Board {
  id: string; // Document ID from Firestore
  workspaceId?: string; // Optional for now
  name: string;
  ownerId: string; // UserProfile.id - who created/owns the board
  columns: Column[]; // Stored directly in the board document
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface Column {
  id: string; // e.g., 'col-todo', 'col-progress', 'col-done' - can be generated
  name: string;
  taskIds: string[]; // Ordered list of Task.id in this column
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string; // Document ID from Firestore
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string; // ISO string
  assigneeIds?: string[]; // Array of UserProfile.id
  subtasks: Subtask[];
  comments: Comment[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  boardId: string; // Board.id - which board this task belongs to
  columnId: string; // Column.id - which column this task is in
  creatorId: string; // UserProfile.id - who created the task
  order?: number; // Optional: for ordering within a column if not relying on taskIds array order
  isArchived?: boolean;
  archivedAt?: string; // ISO string, when the task was archived
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
  workspaceId?: string; // To associate invite with a specific workspace/board
  boardId?: string;
  token?: string; // For verification, to be implemented
  status?: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface AISummary {
  summary: string;
}

export interface AISubtaskSuggestion {
  id: string;
  text: string;
}
