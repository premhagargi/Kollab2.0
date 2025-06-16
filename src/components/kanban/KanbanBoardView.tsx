
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { GenerateClientUpdateModal } from '../modals/GenerateClientUpdateModal';
import { ShareWorkflowModal } from '../modals/ShareWorkflowModal';
import { Button } from '@/components/ui/button';
import type { Workflow, Task, Column as ColumnType, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2, MessageSquareText, Share2, MoreHorizontal } from 'lucide-react';
import { getWorkflowById, updateWorkflow } from '@/services/workflowService';
import { getTasksByWorkflow, createTask, updateTask as updateTaskService, deleteTask } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const DEFAULT_NEW_TASK_TITLE = 'New Task';

interface KanbanBoardViewProps {
  workflowId: string | null;
  onTaskClick: (task: Task) => void;
  setProvisionalNewTaskId: (taskId: string | null) => void;
  // Props for "Create New Workflow" and "Select Workflow" will be handled by AppHeader's mobile sheet
}

export function KanbanBoardView({ workflowId, onTaskClick, setProvisionalNewTaskId }: KanbanBoardViewProps) {
  const { user } = useAuth();
  const [isClientUpdateModalOpen, setIsClientUpdateModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [workflowTasks, setWorkflowTasks] = useState<Task[]>([]);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
  const { toast } = useToast();
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const fetchWorkflowData = useCallback(async (id: string, currentUserId: string) => {
    if (!id || !currentUserId) {
      setIsLoadingWorkflow(false);
      return;
    }
    setIsLoadingWorkflow(true);
    setUserProfiles({});
    setIsAddingColumn(false);

    try {
      const workflowData = await getWorkflowById(id);
      if (workflowData && workflowData.ownerId === currentUserId) {
        setCurrentWorkflow(workflowData);
        const tasksData = await getTasksByWorkflow(id, currentUserId);
        setWorkflowTasks(tasksData.map(task => ({
            ...task,
            isCompleted: task.isCompleted || false,
            isBillable: task.isBillable || false,
            clientName: task.clientName || '',
            deliverables: task.deliverables || []
        })));

        const allUserIds = new Set<string>();
        tasksData.forEach(task => {
          if (task.creatorId) allUserIds.add(task.creatorId);
        });
        if (allUserIds.size > 0) {
          const profiles = await getUsersByIds(Array.from(allUserIds));
          const profilesMap: Record<string, UserProfile | null> = {};
          profiles.forEach(p => profilesMap[p.id] = p);
          setUserProfiles(profilesMap);
        }
      } else if (workflowData) {
        toast({ title: "Access Denied", description: "You do not have permission to view this workflow.", variant: "destructive" });
        setCurrentWorkflow(null); setWorkflowTasks([]);
      } else {
        toast({ title: "Workflow Not Found", description: "The requested workflow does not exist.", variant: "destructive" });
        setCurrentWorkflow(null); setWorkflowTasks([]);
      }
    } catch (error) {
      console.error("Error fetching workflow data:", error);
      toast({ title: "Error", description: "Could not load workflow data.", variant: "destructive" });
    } finally {
      setIsLoadingWorkflow(false);
    }
  }, [toast]);

  useEffect(() => {
    const currentUserId = user?.id;
    if (workflowId && currentUserId) {
      fetchWorkflowData(workflowId, currentUserId);
    } else {
      setCurrentWorkflow(null);
      setWorkflowTasks([]);
      setUserProfiles({});
      setIsAddingColumn(false);
    }
  }, [workflowId, user?.id, fetchWorkflowData]);


  const handleAddTask = async (columnId: string) => {
    if (!user || !user.id || !currentWorkflow) {
      toast({ title: "Error", description: "Cannot add task without a selected workflow or user.", variant: "destructive" });
      return;
    }
    const targetColumn = currentWorkflow.columns.find(col => col.id === columnId) || currentWorkflow.columns[0];
    if (!targetColumn) {
        toast({ title: "Error", description: "Cannot add task: No columns available.", variant: "destructive" });
        return;
    }

    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'isBillable' | 'clientName' | 'deliverables'> = {
      title: DEFAULT_NEW_TASK_TITLE,
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      workflowId: currentWorkflow.id,
      columnId: targetColumn.id,
      creatorId: user.id,
      ownerId: user.id,
      isArchived: false,
    };

    try {
      const createdTask = await createTask(newTaskData);
      setProvisionalNewTaskId(createdTask.id); 
      setWorkflowTasks(prevTasks => [...prevTasks, createdTask]);
      const updatedWorkflowColumns = currentWorkflow.columns.map(col => {
        if (col.id === targetColumn.id) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      setCurrentWorkflow(prevWorkflow => prevWorkflow ? { ...prevWorkflow, columns: updatedWorkflowColumns } : null);
      
      onTaskClick(createdTask); 

      updateWorkflow(currentWorkflow.id, { columns: updatedWorkflowColumns })
         .catch(err => {
            console.error("Error updating workflow in background after task creation:", err);
            toast({title: "Workflow Update Error", description: "Could not save new task to workflow.", variant: "destructive"});
         });

      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
        getUsersByIds([createdTask.creatorId]).then(profile => {
          if (profile.length > 0) {
            setUserProfiles(prev => ({ ...prev, [createdTask.creatorId]: profile[0] }));
          }
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast({ title: "Error Creating Task", description: "Failed to create new task.", variant: "destructive" });
    }
  };

  const handleAddColumn = async (columnName: string) => {
    if (!user || !user.id || !currentWorkflow) {
      toast({ title: "Error", description: "Cannot add column.", variant: "destructive" });
      setIsAddingColumn(false); return;
    }
    if (!columnName.trim()) {
      toast({ title: "Invalid Name", description: "Column name cannot be empty.", variant: "destructive"}); return;
    }
    const newColumn: ColumnType = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, name: columnName.trim(), taskIds: [],
    };
    const updatedColumns = [...currentWorkflow.columns, newColumn];
    try {
      await updateWorkflow(currentWorkflow.id, { columns: updatedColumns });
      setCurrentWorkflow(prev => prev ? { ...prev, columns: updatedColumns } : null);
      toast({ title: "Column Added", description: `Column "${newColumn.name}" added.` });
      setIsAddingColumn(false);
    } catch (error) {
      console.error("Error adding column:", error);
      toast({ title: "Error Adding Column", variant: "destructive" });
      setIsAddingColumn(false);
    }
  };

 const handleTaskDrop = async (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => {
    if (!currentWorkflow || !user || !user.id) return;
    const taskToMove = workflowTasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    let newWorkflowColumns = JSON.parse(JSON.stringify(currentWorkflow.columns)) as ColumnType[];
    const sourceColIndex = newWorkflowColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newWorkflowColumns.findIndex(col => col.id === destinationColumnId);

    if (sourceColIndex === -1 || destColIndex === -1) {
        if (currentWorkflow && user?.id) fetchWorkflowData(currentWorkflow.id, user.id);
        return;
    }
    if (sourceColumnId !== destinationColumnId) {
        setWorkflowTasks(prevTasks => prevTasks.map(t => (t.id === taskId ? { ...t, columnId: destinationColumnId } : t)));
    }
    newWorkflowColumns[sourceColIndex].taskIds = newWorkflowColumns[sourceColIndex].taskIds.filter(id => id !== taskId);
    let destTaskIds = [...newWorkflowColumns[destColIndex].taskIds];
    const currentTaskIndexInDest = destTaskIds.indexOf(taskId);
    if (currentTaskIndexInDest > -1) destTaskIds.splice(currentTaskIndexInDest, 1);
    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;
    if (targetIndexInDest !== -1) destTaskIds.splice(targetIndexInDest, 0, taskId);
    else destTaskIds.push(taskId);
    newWorkflowColumns[destColIndex].taskIds = destTaskIds;
    setCurrentWorkflow(prev => (prev ? { ...prev, columns: newWorkflowColumns } : null));

    try {
        if (sourceColumnId !== destinationColumnId) await updateTaskService(taskId, { columnId: destinationColumnId });
        await updateWorkflow(currentWorkflow.id, { columns: newWorkflowColumns });
    } catch (error) {
        console.error("Error moving task:", error);
        toast({ title: "Error Moving Task", variant: "destructive" });
        if (currentWorkflow && user?.id) fetchWorkflowData(currentWorkflow.id, user.id);
    }
};

  const handleUpdateColumnName = async (columnId: string, newName: string) => {
    if (!currentWorkflow || !user || !user.id) {
      toast({ title: "Error", description: "Cannot update column name.", variant: "destructive" }); return;
    }
    const oldColumns = currentWorkflow.columns;
    const updatedColumns = oldColumns.map(col => col.id === columnId ? { ...col, name: newName } : col);
    setCurrentWorkflow(prev => prev ? { ...prev, columns: updatedColumns } : null);
    try {
      await updateWorkflow(currentWorkflow.id, { columns: updatedColumns });
      toast({ title: "Column Renamed", description: `Column renamed to "${newName}".` });
    } catch (error) {
      console.error("Error updating column name:", error);
      toast({ title: "Error Renaming Column", variant: "destructive" });
      setCurrentWorkflow(prev => prev ? { ...prev, columns: oldColumns } : null);
    }
  };

  const handleToggleTaskCompleted = async (taskId: string, completed: boolean) => {
    if (!user || !user.id || !currentWorkflow) {
      toast({ title: "Error", description: "Cannot update task.", variant: "destructive" }); return;
    }
    const originalTasks = [...workflowTasks];
    setWorkflowTasks(prevTasks =>
      prevTasks.map(t => t.id === taskId ? { ...t, isCompleted: completed, updatedAt: new Date().toISOString() } : t)
    );
    try {
      await updateTaskService(taskId, { isCompleted: completed });
      toast({ title: "Task Updated", description: `Task marked as ${completed ? 'complete' : 'incomplete'}.`});
    } catch (error) {
      console.error("Error updating task completion:", error);
      toast({ title: "Error Updating Task", variant: "destructive" });
      setWorkflowTasks(originalTasks);
    }
  };

  const activeTasks = workflowTasks.filter(task => !task.isArchived);

  if (isLoadingWorkflow && !(user?.id && workflowId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }
  if (!currentWorkflow && !isLoadingWorkflow) return null; // Handled by parent page if no workflow selected

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {isLoadingWorkflow && currentWorkflow && (
         <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      )}
      {currentWorkflow && (
        <>
          {/* This header is part of KanbanBoardView, specific to the current workflow */}
          <div className="flex-shrink-0 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:py-3 bg-background border-b shadow-sm">
            <h1 className="text-base sm:text-lg font-semibold truncate order-1 sm:order-none min-w-0 flex-1 sm:flex-none">
              {currentWorkflow.name}
            </h1>
            <div className="flex items-center space-x-1 sm:space-x-2 order-none sm:order-1 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="p-2 sm:px-3"
                onClick={() => handleAddTask(currentWorkflow.columns[0]?.id ?? '')}
                disabled={currentWorkflow.columns.length === 0 || isLoadingWorkflow}
                title="New Task"
              >
                <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">New Task</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="p-2 sm:px-3"
                onClick={() => setIsClientUpdateModalOpen(true)}
                disabled={workflowTasks.length === 0 || isLoadingWorkflow}
                title="Client Update"
              >
                <MessageSquareText className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Client Update</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="p-2 sm:px-3"
                onClick={() => setIsShareModalOpen(true)}
                disabled={isLoadingWorkflow}
                title="Share Workflow"
              >
                <Share2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
              </Button>
              {/* <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="More options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}}>Rename Workflow</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}} className="text-destructive">Delete Workflow</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> */}
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 whitespace-nowrap">
            <KanbanBoard
              workflowColumns={currentWorkflow.columns}
              allTasksForWorkflow={activeTasks}
              creatorProfiles={userProfiles}
              onTaskClick={onTaskClick}
              onAddTask={handleAddTask}
              onAddColumn={handleAddColumn}
              onTaskDrop={handleTaskDrop}
              isAddingColumn={isAddingColumn}
              setIsAddingColumn={setIsAddingColumn}
              onUpdateColumnName={handleUpdateColumnName}
              onToggleTaskCompleted={handleToggleTaskCompleted}
            />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </>
      )}
      {isClientUpdateModalOpen && currentWorkflow && (
        <GenerateClientUpdateModal
            isOpen={isClientUpdateModalOpen}
            onClose={() => setIsClientUpdateModalOpen(false)}
            workflowId={currentWorkflow.id}
            workflowName={currentWorkflow.name}
        />
      )}
      {isShareModalOpen && currentWorkflow && (
        <ShareWorkflowModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            currentWorkflowName={currentWorkflow.name}
        />
      )}
    </div>
  );
}
