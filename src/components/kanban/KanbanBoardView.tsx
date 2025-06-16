
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { GenerateClientUpdateModal } from '../modals/GenerateClientUpdateModal';
import { ShareWorkflowModal } from '../modals/ShareWorkflowModal';
import { AutomatedUpdateSettingsModal } from '../modals/AutomatedUpdateSettingsModal'; // Import new modal
import { Button } from '@/components/ui/button';
import type { Workflow, Task, Column as ColumnType, UserProfile } from '@/types';
import { Plus, Loader2, MessageSquareText, Share2, Settings2 } from 'lucide-react'; // Added Settings2 icon
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface KanbanBoardViewProps {
  workflow: Workflow | null; // Changed to pass full workflow object
  allTasksForWorkflow: Task[];
  creatorProfiles: Record<string, UserProfile | null>;
  isLoading: boolean;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string, taskTitle: string) => Promise<Task | null>;
  onTaskDrop: (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => Promise<void>;
  onUpdateColumnName: (columnId: string, newName: string) => Promise<void>;
  onToggleTaskCompleted: (taskId: string, completed: boolean) => Promise<void>;
  onAddColumn: (columnName: string) => Promise<void>;
  onWorkflowSettingsUpdate: (updatedWorkflowData: Partial<Workflow>) => void; // New prop for settings update
}

export function KanbanBoardView({
  workflow, // Use workflow directly
  allTasksForWorkflow,
  creatorProfiles,
  isLoading,
  onTaskClick,
  onAddTask,
  onTaskDrop,
  onUpdateColumnName,
  onToggleTaskCompleted,
  onAddColumn,
  onWorkflowSettingsUpdate, // Destructure new prop
}: KanbanBoardViewProps) {
  const [isClientUpdateModalOpen, setIsClientUpdateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAutoUpdateSettingsModalOpen, setIsAutoUpdateSettingsModalOpen] = useState(false); // State for new modal
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const DEFAULT_NEW_TASK_TITLE = 'New Task';

  const handleLocalAddTask = async (columnId: string) => {
    const createdTask = await onAddTask(columnId, DEFAULT_NEW_TASK_TITLE);
    if (createdTask) {
      // onTaskClick is called by parent `page.tsx` after task creation and modal opening.
    }
  };
  
  const handleLocalAddColumn = async (columnName: string) => {
    await onAddColumn(columnName);
    setIsAddingColumn(false); 
  };

  if (isLoading && !workflow?.id) { 
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!workflow?.id || !workflow.columns) { 
     return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground">Select or create a workflow to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isLoading && workflow?.id && ( 
         <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      )}
      <>
        <div className="flex-shrink-0 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:py-3 bg-background border-b shadow-sm">
          <h1 className="text-base sm:text-lg font-semibold truncate order-1 sm:order-none min-w-0 flex-1 sm:flex-none">
            {workflow.name}
          </h1>
          <div className="flex items-center space-x-1 sm:space-x-2 order-none sm:order-1 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="p-2 sm:px-3"
              onClick={() => handleLocalAddTask(workflow.columns[0]?.id ?? '')}
              disabled={workflow.columns.length === 0 || isLoading}
              title="New Task"
            >
              <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">New Task</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="p-2 sm:px-3"
              onClick={() => setIsClientUpdateModalOpen(true)}
              disabled={allTasksForWorkflow.length === 0 || isLoading}
              title="Client Update"
            >
              <MessageSquareText className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Client Update</span>
            </Button>
            <Button // New Button for Auto-Update Settings
              size="sm"
              variant="ghost"
              className="p-2 sm:px-3"
              onClick={() => setIsAutoUpdateSettingsModalOpen(true)}
              disabled={isLoading}
              title="Auto-Update Settings"
            >
              <Settings2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Automation</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="p-2 sm:px-3"
              onClick={() => setIsShareModalOpen(true)}
              disabled={isLoading}
              title="Share Workflow"
            >
              <Share2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 whitespace-nowrap">
          <KanbanBoard
            workflowColumns={workflow.columns}
            allTasksForWorkflow={allTasksForWorkflow.filter(task => !task.isArchived)}
            creatorProfiles={creatorProfiles}
            onTaskClick={onTaskClick}
            onAddTask={handleLocalAddTask} 
            onAddColumn={handleLocalAddColumn} 
            onTaskDrop={onTaskDrop}
            isAddingColumn={isAddingColumn}
            setIsAddingColumn={setIsAddingColumn}
            onUpdateColumnName={onUpdateColumnName}
            onToggleTaskCompleted={onToggleTaskCompleted}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </>
      {isClientUpdateModalOpen && workflow?.id && (
        <GenerateClientUpdateModal
            isOpen={isClientUpdateModalOpen}
            onClose={() => setIsClientUpdateModalOpen(false)}
            workflowId={workflow.id}
            workflowName={workflow.name}
        />
      )}
      {isShareModalOpen && (
        <ShareWorkflowModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            currentWorkflowName={workflow.name}
        />
      )}
      {isAutoUpdateSettingsModalOpen && workflow && ( // Conditionally render new modal
        <AutomatedUpdateSettingsModal
            isOpen={isAutoUpdateSettingsModalOpen}
            onClose={() => setIsAutoUpdateSettingsModalOpen(false)}
            workflow={workflow}
            onWorkflowSettingsUpdate={onWorkflowSettingsUpdate}
        />
      )}
    </div>
  );
}
