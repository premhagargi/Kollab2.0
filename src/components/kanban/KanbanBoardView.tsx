
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { GenerateClientUpdateModal } from '../modals/GenerateClientUpdateModal'; // Added import
import { Button } from '@/components/ui/button';
import type { Workflow, Task, Column as ColumnType, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
import { getWorkflowById, updateWorkflow } from '@/services/workflowService';
import { getTasksByWorkflow, createTask, updateTask as updateTaskService, deleteTask } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';

const DEFAULT_NEW_TASK_TITLE = 'New Task';

export function KanbanBoardView({ workflowId }: { workflowId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isClientUpdateModalOpen, setIsClientUpdateModalOpen] = useState(false); // New state for client update modal
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [workflowTasks, setWorkflowTasks] = useState<Task[]>([]);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
  const provisionalNewTaskIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const fetchWorkflowData = useCallback(async (id: string) => {
    if (!user) return;
    setIsLoadingWorkflow(true);
    setUserProfiles({});
    setIsAddingColumn(false);
    try {
      const workflowData = await getWorkflowById(id);
      if (workflowData && workflowData.ownerId === user.id) {
        setCurrentWorkflow(workflowData);
        const tasksData = await getTasksByWorkflow(id);
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
  }, [user, toast]);

  useEffect(() => {
    if (workflowId) {
      fetchWorkflowData(workflowId);
    } else {
      setCurrentWorkflow(null);
      setWorkflowTasks([]);
      setUserProfiles({});
      setIsAddingColumn(false);
    }
  }, [workflowId, fetchWorkflowData]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const deleteProvisionalTask = async (taskIdToDelete: string) => {
    if (!currentWorkflow || !user) return;
    try {
      await deleteTask(taskIdToDelete);
      const updatedWorkflowColumns = currentWorkflow.columns.map(col => ({
        ...col,
        taskIds: col.taskIds.filter(id => id !== taskIdToDelete)
      }));
      setCurrentWorkflow(prevWorkflow => prevWorkflow ? { ...prevWorkflow, columns: updatedWorkflowColumns } : null);
      if (currentWorkflow) {
        await updateWorkflow(currentWorkflow.id, { columns: updatedWorkflowColumns });
      }
      setWorkflowTasks(prevTasks => prevTasks.filter(t => t.id !== taskIdToDelete));
      toast({ title: "New Task Discarded", description: "The empty new task was removed." });
    } catch (error) {
      console.error("Error deleting provisional task:", error);
      toast({ title: "Error", description: "Could not remove the provisional task.", variant: "destructive" });
      if (currentWorkflow) fetchWorkflowData(currentWorkflow.id);
    }
  };

  const handleCloseTaskModal = () => {
    if (provisionalNewTaskIdRef.current && selectedTask && selectedTask.id === provisionalNewTaskIdRef.current) {
        const taskInWorkflowTasks = workflowTasks.find(t => t.id === selectedTask.id);
        if (taskInWorkflowTasks && taskInWorkflowTasks.title === DEFAULT_NEW_TASK_TITLE && (!taskInWorkflowTasks.description || taskInWorkflowTasks.description.trim() === '')) {
            deleteProvisionalTask(selectedTask.id);
        }
    }
    provisionalNewTaskIdRef.current = null;
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentWorkflow) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setWorkflowTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));

      if (provisionalNewTaskIdRef.current === updatedTask.id) {
        provisionalNewTaskIdRef.current = null;
      }

      if (updatedTask.creatorId && !userProfiles[updatedTask.creatorId]) {
        const profile = await getUsersByIds([updatedTask.creatorId]);
        if (profile.length > 0) {
          setUserProfiles(prev => ({ ...prev, [updatedTask.creatorId]: profile[0] }));
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!user || !currentWorkflow) {
      toast({ title: "Error", description: "Cannot add task without a selected workflow or user.", variant: "destructive" });
      return;
    }
    const targetColumn = currentWorkflow.columns.find(col => col.id === columnId) || currentWorkflow.columns[0];

    if (!targetColumn) {
        toast({ title: "Error", description: "Cannot add task: No columns available on the workflow.", variant: "destructive" });
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
      isArchived: false,
    };

    try {
      const createdTask = await createTask(newTaskData);
      provisionalNewTaskIdRef.current = createdTask.id;
      setWorkflowTasks(prevTasks => [...prevTasks, createdTask]);
      const updatedWorkflowColumns = currentWorkflow.columns.map(col => {
        if (col.id === targetColumn.id) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      setCurrentWorkflow(prevWorkflow => prevWorkflow ? { ...prevWorkflow, columns: updatedWorkflowColumns } : null);

      handleTaskClick(createdTask);

      updateWorkflow(currentWorkflow.id, { columns: updatedWorkflowColumns })
         .catch(err => {
            console.error("Error updating workflow in background after task creation:", err);
            toast({title: "Workflow Update Error", description: "Could not save new task to workflow structure in background.", variant: "destructive"});
         });

      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
        getUsersByIds([createdTask.creatorId]).then(profile => {
          if (profile.length > 0) {
            setUserProfiles(prev => ({ ...prev, [createdTask.creatorId]: profile[0] }));
          }
        }).catch(profileError => console.error("Error fetching creator profile for new task:", profileError));
      }

    } catch (error) {
      console.error("Error creating task:", error);
      toast({ title: "Error Creating Task", description: "Failed to create new task.", variant: "destructive" });
    }
  };

  const handleAddColumn = async (columnName: string) => {
    if (!user || !currentWorkflow) {
      toast({ title: "Authentication Error", description: "Cannot add column without a selected workflow or user.", variant: "destructive" });
      setIsAddingColumn(false); 
      return;
    }

    const trimmedColumnName = columnName.trim();
    if (!trimmedColumnName) {
      toast({ title: "Invalid Column Name", description: "Column name cannot be empty.", variant: "destructive"});
      return; 
    }

    const newColumn: ColumnType = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedColumnName,
      taskIds: [],
    };

    const updatedColumns = [...currentWorkflow.columns, newColumn];
    try {
      await updateWorkflow(currentWorkflow.id, { columns: updatedColumns });
      setCurrentWorkflow(prevWorkflow => prevWorkflow ? { ...prevWorkflow, columns: updatedColumns } : null);
      toast({ title: "Column Added", description: `Column "${newColumn.name}" added successfully.` });
      setIsAddingColumn(false);
    } catch (error) {
      console.error("Error adding column to Firestore:", error);
      toast({ title: "Error Adding Column", description: "Failed to save the new column to the database.", variant: "destructive" });
      setIsAddingColumn(false);
    }
  };

 const handleTaskDrop = async (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => {
    if (!currentWorkflow || !user) return;

    const taskToMove = workflowTasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    let newWorkflowColumns = JSON.parse(JSON.stringify(currentWorkflow.columns)) as ColumnType[];
    const sourceColIndex = newWorkflowColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newWorkflowColumns.findIndex(col => col.id === destinationColumnId);

    if (sourceColIndex === -1 || destColIndex === -1) {
        console.error("Source or destination column not found during drag and drop.");
        if (currentWorkflow) fetchWorkflowData(currentWorkflow.id);
        return;
    }

    if (sourceColumnId !== destinationColumnId) {
        setWorkflowTasks(prevTasks =>
            prevTasks.map(t => (t.id === taskId ? { ...t, columnId: destinationColumnId } : t))
        );
    }

    newWorkflowColumns[sourceColIndex].taskIds = newWorkflowColumns[sourceColIndex].taskIds.filter(id => id !== taskId);

    let destTaskIds = [...newWorkflowColumns[destColIndex].taskIds];
    const currentTaskIndexInDest = destTaskIds.indexOf(taskId); 
    if (currentTaskIndexInDest > -1) {
        destTaskIds.splice(currentTaskIndexInDest, 1); 
    }

    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;

    if (sourceColumnId === destinationColumnId) { 
        if (targetIndexInDest !== -1) { 
            destTaskIds.splice(targetIndexInDest, 0, taskId);
        } else { 
            destTaskIds.push(taskId);
        }
    } else { 
        if (targetIndexInDest !== -1) { 
            destTaskIds.splice(targetIndexInDest, 0, taskId);
        } else { 
            destTaskIds.push(taskId);
        }
    }
    newWorkflowColumns[destColIndex].taskIds = destTaskIds;

    setCurrentWorkflow(prevWorkflow => (prevWorkflow ? { ...prevWorkflow, columns: newWorkflowColumns } : null));

    try {
        if (sourceColumnId !== destinationColumnId) {
            await updateTaskService(taskId, { columnId: destinationColumnId });
        }
        await updateWorkflow(currentWorkflow.id, { columns: newWorkflowColumns });
    } catch (error) {
        console.error("Error moving task:", error);
        toast({ title: "Error Moving Task", description: "Could not update task position. Re-fetching workflow.", variant: "destructive" });
        if (currentWorkflow) fetchWorkflowData(currentWorkflow.id);
    }
};

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user || !currentWorkflow) return;

    const originalWorkflowTasks = [...workflowTasks];
    const originalWorkflowState = currentWorkflow ? JSON.parse(JSON.stringify(currentWorkflow)) : null;

    setWorkflowTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    const updatedColumns = currentWorkflow.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    setCurrentWorkflow(prevWorkflow => prevWorkflow ? { ...prevWorkflow, columns: updatedColumns } : null);

    const previouslySelectedTask = selectedTask;
    if (isTaskModalOpen && previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
        setIsTaskModalOpen(false);
        setSelectedTask(null);
    }

    try {
      await updateTaskService(taskToArchive.id, { isArchived: true, archivedAt: new Date().toISOString() });
      await updateWorkflow(currentWorkflow.id, { columns: updatedColumns });
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({ title: "Error Archiving Task", description: "Could not archive task. Reverting.", variant: "destructive" });
      setWorkflowTasks(originalWorkflowTasks);
      if (originalWorkflowState) setCurrentWorkflow(originalWorkflowState);
       if (previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
         setSelectedTask(previouslySelectedTask);
         setIsTaskModalOpen(true);
       }
    }
  };

  const handleUpdateColumnName = async (columnId: string, newName: string) => {
    if (!currentWorkflow || !user) {
      toast({ title: "Error", description: "Cannot update column name: No workflow or user.", variant: "destructive" });
      return;
    }

    const oldColumns = currentWorkflow.columns;
    const updatedColumns = oldColumns.map(col =>
      col.id === columnId ? { ...col, name: newName } : col
    );

    setCurrentWorkflow(prevWorkflow =>
      prevWorkflow ? { ...prevWorkflow, columns: updatedColumns } : null
    );

    try {
      await updateWorkflow(currentWorkflow.id, { columns: updatedColumns });
      toast({ title: "Column Renamed", description: `Column renamed to "${newName}".` });
    } catch (error) {
      console.error("Error updating column name in Firestore:", error);
      toast({ title: "Error Renaming Column", description: "Failed to save column name. Reverting.", variant: "destructive" });
      setCurrentWorkflow(prevWorkflow =>
        prevWorkflow ? { ...prevWorkflow, columns: oldColumns } : null
      );
    }
  };

  const handleToggleTaskCompleted = async (taskId: string, completed: boolean) => {
    if (!user || !currentWorkflow) {
      toast({ title: "Error", description: "Cannot update task: No workflow or user.", variant: "destructive" });
      return;
    }
    
    const originalTasks = [...workflowTasks];
    setWorkflowTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, isCompleted: completed, updatedAt: new Date().toISOString() } : t)
    );

    try {
      await updateTaskService(taskId, { isCompleted: completed });
      toast({ 
        title: "Task Updated", 
        description: `Task marked as ${completed ? 'complete' : 'incomplete'}.` 
      });
    } catch (error) {
      console.error("Error updating task completion status:", error);
      toast({ title: "Error Updating Task", description: "Could not save task completion status. Reverting.", variant: "destructive" });
      setWorkflowTasks(originalTasks);
    }
  };


  const activeTasks = workflowTasks.filter(task => !task.isArchived);

  if (isLoadingWorkflow) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!currentWorkflow) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 bg-background shadow-sm flex-shrink-0">
        <h1 className="text-lg font-medium truncate pr-2 py-3">{currentWorkflow.name}</h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
           <Button
            size="sm"
            onClick={() => setIsClientUpdateModalOpen(true)}
            disabled={workflowTasks.length === 0}
            variant="outline"
            className="border-border/70 hover:bg-muted/50"
          >
            <MessageSquareText className="mr-1 h-3 w-3" /> Client Update
          </Button>
          <Button
            size="sm"
            onClick={() => handleAddTask(currentWorkflow.columns[0]?.id ?? '')}
            disabled={currentWorkflow.columns.length === 0}
            variant="default"
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-1 h-3 w-3" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <KanbanBoard
          workflowColumns={currentWorkflow.columns}
          allTasksForWorkflow={activeTasks}
          creatorProfiles={userProfiles}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onAddColumn={handleAddColumn}
          onTaskDrop={handleTaskDrop}
          isAddingColumn={isAddingColumn}
          setIsAddingColumn={setIsAddingColumn}
          onUpdateColumnName={handleUpdateColumnName}
          onToggleTaskCompleted={handleToggleTaskCompleted} 
        />
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
        />
      )}
      {isClientUpdateModalOpen && currentWorkflow && (
        <GenerateClientUpdateModal
            isOpen={isClientUpdateModalOpen}
            onClose={() => setIsClientUpdateModalOpen(false)}
            workflowId={currentWorkflow.id}
            workflowName={currentWorkflow.name}
        />
      )}
    </div>
  );
}

