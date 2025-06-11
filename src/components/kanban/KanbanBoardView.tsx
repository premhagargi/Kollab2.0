
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { Button } from '@/components/ui/button';
import type { Board, Task, Column as ColumnType, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2 } from 'lucide-react';
import { getBoardById, updateBoard } from '@/services/boardService';
import { getTasksByBoard, createTask, updateTask as updateTaskService, archiveTask as archiveTaskService, deleteTask } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';

const DEFAULT_NEW_TASK_TITLE = 'New Task';

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
  const provisionalNewTaskIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const fetchBoardData = useCallback(async (id: string) => {
    if (!user) return;
    setIsLoadingBoard(true);
    setUserProfiles({});
    try {
      const boardData = await getBoardById(id);
      if (boardData && boardData.ownerId === user.id) {
        setCurrentBoard(boardData);
        const tasksData = await getTasksByBoard(id);
        setBoardTasks(tasksData); // Store all tasks, filtering for active happens before passing to KanbanBoard

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
      } else if (boardData) {
        toast({ title: "Access Denied", description: "You do not have permission to view this board.", variant: "destructive" });
        setCurrentBoard(null); setBoardTasks([]);
      } else {
        toast({ title: "Board Not Found", description: "The requested board does not exist.", variant: "destructive" });
        setCurrentBoard(null); setBoardTasks([]);
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
      toast({ title: "Error", description: "Could not load board data.", variant: "destructive" });
    } finally {
      setIsLoadingBoard(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (boardId) {
      fetchBoardData(boardId);
    } else {
      setCurrentBoard(null);
      setBoardTasks([]);
      setUserProfiles({});
    }
  }, [boardId, fetchBoardData]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const deleteProvisionalTask = async (taskIdToDelete: string) => {
    if (!currentBoard || !user) return;
    try {
      await deleteTask(taskIdToDelete);

      const updatedBoardColumns = currentBoard.columns.map(col => ({
        ...col,
        taskIds: col.taskIds.filter(id => id !== taskIdToDelete)
      }));

      await updateBoard(currentBoard.id, { columns: updatedBoardColumns });

      setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskIdToDelete));
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedBoardColumns } : null);
      toast({ title: "New Task Discarded", description: "The empty new task was removed." });
    } catch (error) {
      console.error("Error deleting provisional task:", error);
      toast({ title: "Error", description: "Could not remove the provisional task.", variant: "destructive" });
      // Re-fetch data to ensure consistency if deletion failed partially
      if (currentBoard) fetchBoardData(currentBoard.id);
    }
  };

  const handleCloseModal = () => {
    if (provisionalNewTaskIdRef.current && selectedTask && selectedTask.id === provisionalNewTaskIdRef.current) {
      // This was a provisionally created task. Check if it's still in its default state.
      // The `selectedTask` here is the state from before the modal made *committed* changes.
      // If the modal was just closed (X, Esc) without save, its state is unchanged.
      // If "Cancel" was clicked in modal, modal reverted its internal state to initial, then closed.
      const taskInBoardTasks = boardTasks.find(t => t.id === selectedTask.id);
      if (taskInBoardTasks && taskInBoardTasks.title === DEFAULT_NEW_TASK_TITLE && (!taskInBoardTasks.description || taskInBoardTasks.description.trim() === '')) {
        deleteProvisionalTask(selectedTask.id);
      }
    }
    provisionalNewTaskIdRef.current = null; // Reset the ref
    setIsModalOpen(false);
    setSelectedTask(null);
  };


  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      
      // If this was a provisional task, its successful update means it's no longer provisional
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
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
      throw error; // Re-throw to allow modal to handle its saving state
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add task without a selected board or user.", variant: "destructive" });
      return;
    }
    const firstColumnId = currentBoard.columns[0]?.id;

    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: DEFAULT_NEW_TASK_TITLE,
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      boardId: currentBoard.id,
      columnId: columnId || firstColumnId || '',
      creatorId: user.id,
      isArchived: false,
    };

    if (!newTaskData.columnId) {
      toast({ title: "Error", description: "Cannot add task: No columns available on the board.", variant: "destructive" });
      return;
    }

    try {
      const createdTask = await createTask(newTaskData);
      provisionalNewTaskIdRef.current = createdTask.id; // Mark as provisional

      setBoardTasks(prevTasks => [...prevTasks, createdTask]);

      const updatedBoardColumns = currentBoard.columns.map(col => {
        if (col.id === (columnId || firstColumnId)) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });

      await updateBoard(currentBoard.id, { columns: updatedBoardColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedBoardColumns } : null);

      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
        const profile = await getUsersByIds([createdTask.creatorId]);
        if (profile.length > 0) {
          setUserProfiles(prev => ({ ...prev, [createdTask.creatorId]: profile[0] }));
        }
      }

      handleTaskClick(createdTask); // This opens the modal
      // Toast for successful creation is removed, as it might be discarded.
      // A toast can be added in handleUpdateTask upon first *successful* save of a new task if desired.

    } catch (error) {
      console.error("Error creating task:", error);
      toast({ title: "Error", description: "Failed to create new task.", variant: "destructive" });
    }
  };

  const handleAddColumn = async () => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add column without a selected board or user.", variant: "destructive" });
      return;
    }
    const columnName = prompt("Enter new column name:");
    if (!columnName || !columnName.trim()) {
      toast({ title: "Cancelled", description: "Column creation cancelled or name empty.", variant: "default" });
      return;
    }

    const newColumn: ColumnType = {
      id: `col-${Date.now()}`,
      name: columnName.trim(),
      taskIds: [],
    };

    const updatedColumns = [...currentBoard.columns, newColumn];
    try {
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
      toast({ title: "Column Added", description: `Column "${newColumn.name}" added.` });
    } catch (error) {
      console.error("Error adding column:", error);
      toast({ title: "Error", description: "Failed to add column.", variant: "destructive" });
    }
  };

  const handleTaskDrop = async (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => {
    if (!currentBoard || !user) return;

    const taskToMove = boardTasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    let newBoardColumns = JSON.parse(JSON.stringify(currentBoard.columns)) as ColumnType[]; // Deep copy
    let taskUpdatePromise: Promise<void> | null = null;

    // Optimistic UI Update for boardTasks (task's columnId)
    if (sourceColumnId !== destinationColumnId) {
      setBoardTasks(prevTasks =>
        prevTasks.map(t => t.id === taskId ? { ...t, columnId: destinationColumnId } : t)
      );
      taskUpdatePromise = updateTaskService(taskId, { columnId: destinationColumnId });
    }
    
    // Update column taskIds
    const sourceColIndex = newBoardColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newBoardColumns.findIndex(col => col.id === destinationColumnId);

    if (sourceColIndex === -1 || destColIndex === -1) return; // Should not happen

    // Remove from source column
    newBoardColumns[sourceColIndex].taskIds = newBoardColumns[sourceColIndex].taskIds.filter(id => id !== taskId);

    // Add to destination column
    let destTaskIds = [...newBoardColumns[destColIndex].taskIds];
    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;

    if (targetIndexInDest !== -1) {
      destTaskIds.splice(targetIndexInDest, 0, taskId); // Insert before target
    } else {
      destTaskIds.push(taskId); // Append to end
    }
    newBoardColumns[destColIndex].taskIds = destTaskIds;
    
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: newBoardColumns } : null);

    try {
      if (taskUpdatePromise) await taskUpdatePromise;
      await updateBoard(currentBoard.id, { columns: newBoardColumns });
      toast({ title: "Task Moved", description: `Task "${taskToMove.title}" updated.` });
    } catch (error) {
      console.error("Error moving task:", error);
      toast({ title: "Error Moving Task", description: "Could not update task position. Re-fetching board.", variant: "destructive" });
      if (currentBoard) fetchBoardData(currentBoard.id);
    }
  };

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user || !currentBoard) return;

    setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    const updatedColumns = currentBoard.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
    handleCloseModal();

    try {
      await archiveTaskService(taskToArchive.id);
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({ title: "Error Archiving Task", description: "Could not archive task. Re-fetching board.", variant: "destructive" });
      if (currentBoard) fetchBoardData(currentBoard.id);
    }
  };

  const activeTasks = boardTasks.filter(task => !task.isArchived);

  if (isLoadingBoard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (!currentBoard) {
    return null;
  }

  const headerHeight = '4rem';
  const boardHeaderHeight = '3.5rem';

  return (
    <div className="flex flex-col h-full" style={{ ['--header-height' as any]: headerHeight, ['--board-header-height' as any]: boardHeaderHeight }}>
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-2xl font-semibold font-headline">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => handleAddTask(currentBoard.columns[0]?.id ?? '')} disabled={currentBoard.columns.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard
        boardColumns={currentBoard.columns}
        allTasksForBoard={activeTasks}
        creatorProfiles={userProfiles}
        onTaskClick={handleTaskClick}
        onAddTask={onAddTask}
        onAddColumn={handleAddColumn}
        onTaskDrop={handleTaskDrop}
      />
      {selectedTask && ( // Do not filter by isArchived here, modal might be for an archived task if we add "view archive"
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
        />
      )}
    </div>
  );
}

    