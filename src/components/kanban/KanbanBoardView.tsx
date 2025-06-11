
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

      // No need to await updateBoard here if we're just cleaning up a provisional task
      // It will be updated if the user explicitly saves a new task.
      // However, if the task was already added to the column in Firestore by handleAddTask,
      // then we *do* need to update the board to remove it.
      // Let's assume handleAddTask adds it to the board optimistically and then saves.
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
      const taskInBoardTasks = boardTasks.find(t => t.id === selectedTask.id);
      if (taskInBoardTasks && taskInBoardTasks.title === DEFAULT_NEW_TASK_TITLE && (!taskInBoardTasks.description || taskInBoardTasks.description.trim() === '')) {
        deleteProvisionalTask(selectedTask.id);
      }
    }
    provisionalNewTaskIdRef.current = null;
    setIsModalOpen(false);
    setSelectedTask(null);
  };


  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      
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
      // Toast is handled in TaskDetailsModal now on save attempt
      throw error; 
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add task without a selected board or user.", variant: "destructive" });
      return;
    }
    const targetColumn = currentBoard.columns.find(col => col.id === columnId) || currentBoard.columns[0];

    if (!targetColumn) {
        toast({ title: "Error", description: "Cannot add task: No columns available on the board.", variant: "destructive" });
        return;
    }


    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: DEFAULT_NEW_TASK_TITLE,
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      boardId: currentBoard.id,
      columnId: targetColumn.id,
      creatorId: user.id,
      isArchived: false,
    };

    try {
      const createdTask = await createTask(newTaskData);
      provisionalNewTaskIdRef.current = createdTask.id; 

      setBoardTasks(prevTasks => [...prevTasks, createdTask]);

      const updatedBoardColumns = currentBoard.columns.map(col => {
        if (col.id === targetColumn.id) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      
      // Optimistically update board, then save to Firestore
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedBoardColumns } : null);
      await updateBoard(currentBoard.id, { columns: updatedBoardColumns });


      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
        const profile = await getUsersByIds([createdTask.creatorId]);
        if (profile.length > 0) {
          setUserProfiles(prev => ({ ...prev, [createdTask.creatorId]: profile[0] }));
        }
      }

      handleTaskClick(createdTask); 

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
  
    let newBoardColumns = JSON.parse(JSON.stringify(currentBoard.columns)) as ColumnType[];
    let taskUpdatePromise: Promise<void> | null = null;
  
    // Optimistic UI Update for boardTasks (task's columnId if moving between columns)
    if (sourceColumnId !== destinationColumnId) {
      setBoardTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? { ...t, columnId: destinationColumnId } : t))
      );
      taskUpdatePromise = updateTaskService(taskId, { columnId: destinationColumnId });
    }
  
    // Find column indices
    const sourceColIndex = newBoardColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newBoardColumns.findIndex(col => col.id === destinationColumnId);
  
    if (sourceColIndex === -1 || destColIndex === -1) {
      console.error("Source or destination column not found during drag and drop.");
      if (currentBoard) fetchBoardData(currentBoard.id); // Attempt to recover by re-fetching
      return;
    }
  
    // Remove from source column's taskIds
    newBoardColumns[sourceColIndex].taskIds = newBoardColumns[sourceColIndex].taskIds.filter(id => id !== taskId);
  
    // Add to destination column's taskIds (or reorder in the same column)
    let destTaskIds = [...newBoardColumns[destColIndex].taskIds];
    
    // If it's an intra-column move, ensure the task isn't already there (it was filtered above for sourceColIndex,
    // but if sourceColIndex === destColIndex, it's already removed from destTaskIds implicitly).
    // For inter-column moves, it won't be in destTaskIds yet.

    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;
  
    if (targetIndexInDest !== -1) {
      destTaskIds.splice(targetIndexInDest, 0, taskId); // Insert before target
    } else {
      destTaskIds.push(taskId); // Append to end if no target or target not found
    }
    newBoardColumns[destColIndex].taskIds = destTaskIds;
    
    // Optimistically update the currentBoard state
    setCurrentBoard(prevBoard => (prevBoard ? { ...prevBoard, columns: newBoardColumns } : null));
  
    try {
      if (taskUpdatePromise) await taskUpdatePromise;
      await updateBoard(currentBoard.id, { columns: newBoardColumns });
      toast({ title: "Task Moved", description: `Task "${taskToMove.title}" position updated.` });
    } catch (error) {
      console.error("Error moving task:", error);
      toast({ title: "Error Moving Task", description: "Could not update task position. Re-fetching board.", variant: "destructive" });
      if (currentBoard) fetchBoardData(currentBoard.id); // Revert optimistic update by re-fetching
    }
  };
  

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user || !currentBoard) return;

    // Optimistic UI updates
    setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    const updatedColumns = currentBoard.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
    handleCloseModal(); // Close modal after optimistic updates

    try {
      await archiveTaskService(taskToArchive.id);
      await updateBoard(currentBoard.id, { columns: updatedColumns }); // Persist the column changes
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({ title: "Error Archiving Task", description: "Could not archive task. Re-fetching board.", variant: "destructive" });
      // Revert optimistic updates by re-fetching data
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
    // This can happen if boardId is null or fetching failed.
    // The App.tsx page will show a "No boards" or "Login" message.
    return null;
  }

  const headerHeight = '4rem'; // approx from AppHeader
  const boardHeaderHeight = '3.5rem'; // approx height of the board title bar

  return (
    <div className="flex flex-col h-full" style={{ ['--header-height' as any]: headerHeight, ['--board-header-height' as any]: boardHeaderHeight }}>
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-semibold font-headline">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2">
          {/* Add Task button needs to know which column to add to, default to first if none. */}
          <Button 
            size="sm" 
            onClick={() => handleAddTask(currentBoard.columns[0]?.id ?? '')} 
            disabled={currentBoard.columns.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard
        boardColumns={currentBoard.columns}
        allTasksForBoard={activeTasks} // Pass only active tasks to the board display
        creatorProfiles={userProfiles}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
        onAddColumn={handleAddColumn}
        onTaskDrop={handleTaskDrop}
      />
      {selectedTask && (
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
