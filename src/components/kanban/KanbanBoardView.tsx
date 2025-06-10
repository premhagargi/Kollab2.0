
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
import { getTasksByBoard, createTask, updateTask as updateTaskService, archiveTask as archiveTaskService } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
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
        setBoardTasks(tasksData);

        const allUserIds = new Set<string>();
        tasksData.forEach(task => {
          if (task.creatorId) allUserIds.add(task.creatorId);
          // Later, add task.assigneeIds?.forEach(id => allUserIds.add(id));
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      if (updatedTask.creatorId && !userProfiles[updatedTask.creatorId]) {
          const profile = await getUsersByIds([updatedTask.creatorId]);
          if (profile.length > 0) {
            setUserProfiles(prev => ({...prev, [updatedTask.creatorId]: profile[0]}));
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
    const firstColumnId = currentBoard.columns[0]?.id;
    
    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'New Task',
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      boardId: currentBoard.id,
      columnId: columnId || firstColumnId || '',
      creatorId: user.id,
      isArchived: false,
    };

    try {
      const createdTask = await createTask(newTaskData);
      setBoardTasks(prevTasks => [...prevTasks, createdTask]);
      
      const updatedColumns = currentBoard.columns.map(col => {
        if (col.id === (columnId || firstColumnId)) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
      
      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
          const profile = await getUsersByIds([createdTask.creatorId]);
          if (profile.length > 0) {
            setUserProfiles(prev => ({...prev, [createdTask.creatorId]: profile[0]}));
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
    if (sourceColumnId === destinationColumnId) return; 

    const taskToMove = boardTasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    setBoardTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, columnId: destinationColumnId } : t)
    );

    const newBoardColumns = currentBoard.columns.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, taskIds: col.taskIds.filter(id => id !== taskId) };
      }
      if (col.id === destinationColumnId) {
        return { ...col, taskIds: [...col.taskIds, taskId] };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: newBoardColumns } : null);
    
    try {
      await updateTaskService(taskId, { columnId: destinationColumnId });
      await updateBoard(currentBoard.id, { columns: newBoardColumns });
      toast({ title: "Task Moved", description: `Task "${taskToMove.title}" moved to new column.` });
    } catch (error) {
      console.error("Error moving task:", error);
      toast({ title: "Error Moving Task", description: "Could not update task position.", variant: "destructive" });
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
      toast({ title: "Error Archiving Task", description: "Could not archive task.", variant: "destructive" });
      if (currentBoard) {
        fetchBoardData(currentBoard.id);
      }
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
        onAddTask={handleAddTask}
        onAddColumn={handleAddColumn}
        onTaskDrop={handleTaskDrop}
      />
      {selectedTask && !selectedTask.isArchived && (
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
