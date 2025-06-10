
import type { UserProfile, Workspace, Board, Column, Task, TaskPriority } from '@/types';

// This mockUser is mainly for fallback or testing when auth is not fully integrated.
// Actual user data will come from Firebase Auth and Firestore.
export const mockUser: UserProfile = {
  id: 'user-mock-1',
  name: 'Mock User',
  email: 'mock.user@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};


// The following mock data (tasks, columns, board) should ideally no longer be directly used
// by the main application flow once Firestore integration is complete.
// They can be kept for reference, testing, or as a fallback if needed.

const createTasks = (boardId: string, columnId: string, count: number, prefix: string): Task[] => {
  return Array.from({ length: count }, (_, i) => {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + i * 2);
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    return {
      id: `task-${boardId}-${columnId}-${i + 1}`,
      title: `${prefix} Task ${i + 1}`,
      description: `This is a detailed description for ${prefix} Task ${i + 1}. It involves several steps and considerations.`,
      priority: priorities[i % priorities.length],
      dueDate: taskDate.toISOString(),
      assigneeIds: [mockUser.id],
      subtasks: [
        { id: `subtask-${i}-1`, text: 'Define scope', completed: i % 2 === 0 },
        { id: `subtask-${i}-2`, text: 'Develop feature', completed: false },
      ],
      comments: i % 2 === 0 ? [
        { 
          id: `comment-${i}-1`, 
          userId: mockUser.id, 
          userName: mockUser.name || "User",
          userAvatarUrl: mockUser.avatarUrl,
          text: 'This looks good, proceed.', 
          createdAt: new Date().toISOString() 
        }
      ] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      boardId: boardId, // Added boardId
      columnId: columnId, // Added columnId
      creatorId: mockUser.id, // Added creatorId
    };
  });
};

const todoTasks = createTasks('board-mock-1', 'col-mock-1', 3, 'Todo');
const inProgressTasks = createTasks('board-mock-1', 'col-mock-2', 2, 'In Progress');
const doneTasks = createTasks('board-mock-1', 'col-mock-3', 1, 'Done');

export const mockTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];

export const mockColumns: Column[] = [
  { id: 'col-mock-1', name: 'To Do', taskIds: todoTasks.map(t => t.id) },
  { id: 'col-mock-2', name: 'In Progress', taskIds: inProgressTasks.map(t => t.id) },
  { id: 'col-mock-3', name: 'Done', taskIds: doneTasks.map(t => t.id) },
];

export const mockBoard: Board = {
  id: 'board-mock-1',
  workspaceId: 'ws-mock-1',
  name: 'Mock Project Alpha',
  ownerId: mockUser.id,
  columns: mockColumns,
  // tasks: mockTasks, // Tasks are no longer part of the board document directly
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockBoards: Board[] = [mockBoard]; // This should not be used for fetching user boards anymore

export const mockWorkspace: Workspace = {
  id: 'ws-mock-1',
  name: 'Mock Engineering Team',
  ownerId: mockUser.id,
};

export const mockWorkspaces: Workspace[] = [mockWorkspace]; // This should not be used anymore
