
import type { UserProfile, Workspace, Workflow, Column, Task, TaskPriority } from '@/types'; // Renamed Board to Workflow

export const mockUser: UserProfile = {
  id: 'user-mock-1',
  name: 'Mock User',
  email: 'mock.user@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

const createTasks = (workflowId: string, columnId: string, count: number, prefix: string): Task[] => { // Renamed boardId to workflowId
  return Array.from({ length: count }, (_, i) => {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + i * 2);
    const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    return {
      id: `task-${workflowId}-${columnId}-${i + 1}`,
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
      workflowId: workflowId, // Renamed from boardId
      columnId: columnId,
      creatorId: mockUser.id,
      isCompleted: false, // Added default
      isBillable: i % 3 === 0, // Added default
      clientName: i % 2 === 0 ? `Client ${String.fromCharCode(65 + i)}` : '', // Added default
      deliverables: i % 2 === 0 ? [`Deliverable X${i+1}`, `Report Y${i+1}`] : [], // Added default
    };
  });
};

const todoTasks = createTasks('workflow-mock-1', 'col-mock-1', 3, 'Todo');
const inProgressTasks = createTasks('workflow-mock-1', 'col-mock-2', 2, 'In Progress');
const doneTasks = createTasks('workflow-mock-1', 'col-mock-3', 1, 'Done');

export const mockTasks: Task[] = [...todoTasks, ...inProgressTasks, ...doneTasks];

export const mockColumns: Column[] = [
  { id: 'col-mock-1', name: 'To Do', taskIds: todoTasks.map(t => t.id) },
  { id: 'col-mock-2', name: 'In Progress', taskIds: inProgressTasks.map(t => t.id) },
  { id: 'col-mock-3', name: 'Done', taskIds: doneTasks.map(t => t.id) },
];

export const mockWorkflow: Workflow = { // Renamed from mockBoard
  id: 'workflow-mock-1', // Renamed
  workspaceId: 'ws-mock-1',
  name: 'Mock Freelance Project', // Updated name
  ownerId: mockUser.id,
  columns: mockColumns,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  template: 'Freelance Project' // Added template
};

export const mockWorkflows: Workflow[] = [mockWorkflow]; // Renamed

export const mockWorkspace: Workspace = {
  id: 'ws-mock-1',
  name: 'My Freelance Hub', // Updated name
  ownerId: mockUser.id,
};

export const mockWorkspaces: Workspace[] = [mockWorkspace];
