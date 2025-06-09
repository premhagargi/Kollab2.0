import type { UserProfile, Workspace, Board, Column, Task, TaskPriority } from '@/types';

export const mockUser: UserProfile = {
  id: 'user-1',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

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
    };
  });
};

const todoTasks = createTasks('board-1', 'col-1', 3, 'Todo');
const inProgressTasks = createTasks('board-1', 'col-2', 2, 'In Progress');
const doneTasks = createTasks('board-1', 'col-3', 1, 'Done');

export const mockTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];

export const mockColumns: Column[] = [
  { id: 'col-1', name: 'To Do', taskIds: todoTasks.map(t => t.id) },
  { id: 'col-2', name: 'In Progress', taskIds: inProgressTasks.map(t => t.id) },
  { id: 'col-3', name: 'Done', taskIds: doneTasks.map(t => t.id) },
];

export const mockBoard: Board = {
  id: 'board-1',
  workspaceId: 'ws-1',
  name: 'Q3 Project Alpha',
  columns: mockColumns,
  tasks: mockTasks,
};

export const mockBoards: Board[] = [mockBoard];

export const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Engineering Team',
  ownerId: mockUser.id,
};

export const mockWorkspaces: Workspace[] = [mockWorkspace];
