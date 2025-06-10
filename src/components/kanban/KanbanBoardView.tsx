
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { Button } from '@/components/ui/button';
import type { Board, Task, Column as ColumnType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Filter, Plus, RefreshCw, Download, Loader2 } from 'lucide-react';
import { getBoardById, updateBoard } from '@/services/boardService';
import { getTasksByBoard, createTask, updateTask as updateTaskService, deleteTask as deleteTaskService } from '@/services/taskService'; // Aliased updateTask to avoid name clash

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const { toast } = useToast();

  const fetchBoardData = useCallback(async (id: string) => {
    if (!user) return;
    setIsLoadingBoard(true);
    try {
      const boardData = await getBoardById(id);
      if (boardData && boardData.ownerId === user.id) { // Ensure user owns the board
        setCurrentBoard(boardData);
        const tasksData = await getTasksByBoard(id);
        setBoardTasks(tasksData);
      } else if (boardData) {
        toast({ title: "Access Denied", description: "You do not have permission to view this board.", variant: "destructive" });
        setCurrentBoard(null);
        setBoardTasks([]);
      } else {
        toast({ title: "Board Not Found", description: "The requested board does not exist.", variant: "destructive" });
        setCurrentBoard(null);
        setBoardTasks([]);
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
      
      // Add task ID to the column in the board
      const updatedColumns = currentBoard.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);

      handleTaskClick(createdTask); // Open modal for the new task
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
    // Simple prompt for column name for now, ideally use a modal
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
          {/* <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button variant="outline" size="sm" onClick={() => boardId && fetchBoardData(boardId)}><RefreshCw className="mr-2 h-4 w-4" /> Sync</Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button> */}
          <Button size="sm" onClick={() => handleAddTask(currentBoard.columns[0]?.id || '')} disabled={currentBoard.columns.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard 
        boardColumns={currentBoard.columns}
        allTasksForBoard={boardTasks} 
        onTaskClick={handleTaskClick} 
        onAddTask={handleAddTask}
        onAddColumn={handleAddColumn}
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
