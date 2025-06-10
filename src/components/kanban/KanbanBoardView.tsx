
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { Button } from '@/components/ui/button';
import type { Board, Task, Column as ColumnType, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2 } from 'lucide-react';
import { getBoardById, updateBoard } from '@/services/boardService';
import { getTasksByBoard, createTask, updateTask as updateTaskService } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, UserProfile | null>>({});
  const { toast } = useToast();

  const fetchBoardData = useCallback(async (id: string) => {
    if (!user) return;
    setIsLoadingBoard(true);
    setCreatorProfiles({}); // Reset profiles on board change
    try {
      const boardData = await getBoardById(id);
      if (boardData && boardData.ownerId === user.id) {
        setCurrentBoard(boardData);
        const tasksData = await getTasksByBoard(id);
        setBoardTasks(tasksData);

        // Fetch creator profiles for tasks
        if (tasksData.length > 0) {
          const creatorIds = [...new Set(tasksData.map(task => task.creatorId).filter(Boolean))];
          if (creatorIds.length > 0) {
            const profiles = await getUsersByIds(creatorIds as string[]);
            const profilesMap: Record<string, UserProfile | null> = {};
            profiles.forEach(p => profilesMap[p.id] = p);
            setCreatorProfiles(profilesMap);
          }
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
      setCreatorProfiles({});
    }
  }, [boardId, fetchBoardData]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      // If creator changed or task added, refetch profiles if needed
      if (updatedTask.creatorId && !creatorProfiles[updatedTask.creatorId]) {
          const profile = await getUsersByIds([updatedTask.creatorId]);
          if (profile.length > 0) {
            setCreatorProfiles(prev => ({...prev, [updatedTask.creatorId]: profile[0]}));
          }
      }
      toast({ title: "Task Updated", description: `"${updatedTask.title}" has been saved.` });
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    }
  };
  
  const handleAddTask = async (columnId: string) => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add task without a selected board or user.", variant: "destructive" });
      return;
    }
    
    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'New Task',
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      boardId: currentBoard.id,
      columnId: columnId,
      creatorId: user.id,
    };

    try {
      const createdTask = await createTask(newTaskData);
      setBoardTasks(prevTasks => [...prevTasks, createdTask]);
      
      const updatedColumns = currentBoard.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
      
      if (createdTask.creatorId && !creatorProfiles[createdTask.creatorId]) {
          const profile = await getUsersByIds([createdTask.creatorId]);
          if (profile.length > 0) {
            setCreatorProfiles(prev => ({...prev, [createdTask.creatorId]: profile[0]}));
          }
      }

      handleTaskClick(createdTask);
      toast({ title: "Task Created", description: "New task added successfully." });

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

  const handleTaskDrop = async (taskId: string, sourceColumnId: string, destinationColumnId: string) => {
    if (!currentBoard || !user) return;
    if (sourceColumnId === destinationColumnId) return; // No change

    // Optimistic UI Update
    const taskToMove = boardTasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    // Update local tasks
    setBoardTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, columnId: destinationColumnId } : t)
    );

    // Update local board columns
    const newBoardColumns = currentBoard.columns.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
      }
      if (col.id === destinationColumnId) {
        // For now, add to the end. More complex logic needed for specific positioning.
        return { ...col, taskIds: [...col.taskIds, taskId] };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: newBoardColumns } : null);
    
    try {
      // Update task in Firestore
      await updateTaskService(taskId, { columnId: destinationColumnId });
      // Update board columns in Firestore
      await updateBoard(currentBoard.id, { columns: newBoardColumns });
      toast({ title: "Task Moved", description: `Task "${taskToMove.title}" moved to new column.` });
    } catch (error) {
      console.error("Error moving task:", error);
      toast({ title: "Error Moving Task", description: "Could not update task position.", variant: "destructive" });
      // Revert optimistic updates if Firestore update fails
      fetchBoardData(currentBoard.id); // Or a more granular revert
    }
  };


  if (isLoadingBoard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (!currentBoard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
        <h2 className="text-2xl font-semibold mb-2">No Board Selected</h2>
        <p className="text-muted-foreground mb-4">Please select a board from the sidebar to view tasks, or create a new one.</p>
      </div>
    );
  }
  
  const headerHeight = '4rem'; 
  const boardHeaderHeight = '3.5rem'; 

  return (
    <div className="flex flex-col h-full" style={{ ['--header-height' as any]: headerHeight, ['--board-header-height' as any]: boardHeaderHeight }}>
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-2xl font-semibold font-headline">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => handleAddTask(currentBoard.columns[0]?.id || '')} disabled={currentBoard.columns.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard 
        boardColumns={currentBoard.columns}
        allTasksForBoard={boardTasks} 
        creatorProfiles={creatorProfiles}
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
        />
      )}
    </div>
  );
}

    