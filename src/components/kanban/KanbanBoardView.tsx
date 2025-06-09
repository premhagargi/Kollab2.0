// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { Button } from '@/components/ui/button';
import { mockBoard as initialMockBoard, mockTasks as initialMockTasks } from '@/lib/mock-data';
import type { Board, Task } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Filter, Plus, RefreshCw, Download } from 'lucide-react';

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const { toast } = useToast();

  // Simulate fetching board data
  useEffect(() => {
    if (boardId) {
      // In a real app, fetch board data based on boardId
      // For now, we always use the initialMockBoard if boardId matches, or clear if not.
      if (boardId === initialMockBoard.id) {
         // Deep copy mock data to allow modifications
        const boardDataCopy = JSON.parse(JSON.stringify(initialMockBoard));
        setCurrentBoard(boardDataCopy);
      } else {
        setCurrentBoard(null); // Or fetch a different board
      }
    } else {
       // Default to the first mock board if no ID is provided
       const boardDataCopy = JSON.parse(JSON.stringify(initialMockBoard));
       setCurrentBoard(boardDataCopy);
    }
  }, [boardId]);


  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    // This is where you would update the task in your state/backend
    // For mock data, we'll update it in the currentBoard state
    if (currentBoard) {
      const updatedTasks = currentBoard.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
      setCurrentBoard({ ...currentBoard, tasks: updatedTasks });
    }
    // console.log('Updated Task:', updatedTask);
    // In a real app, you might re-fetch board data or update local state more granularly.
  };
  
  const handleAddTask = (columnId: string) => {
    // Placeholder: Open a simplified modal or inline form to add a new task
    toast({
      title: "Add New Task",
      description: `(Placeholder) Adding new task to column ${columnId}.`,
    });
    // Example: Create a new blank task and open modal for it
    const newTask: Task = {
      id: `task-new-${Date.now()}`,
      title: 'New Task',
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Add to board tasks and column taskIds
    if (currentBoard) {
      const boardTasks = [...currentBoard.tasks, newTask];
      const updatedColumns = currentBoard.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, taskIds: [...col.taskIds, newTask.id] };
        }
        return col;
      });
      setCurrentBoard({ ...currentBoard, tasks: boardTasks, columns: updatedColumns });
      handleTaskClick(newTask);
    }
  };

  const handleAddColumn = () => {
     toast({
      title: "Add New Column",
      description: `(Placeholder) Adding new column.`,
    });
  }

  if (!currentBoard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
        <h2 className="text-2xl font-semibold mb-2">No Board Selected</h2>
        <p className="text-muted-foreground mb-4">Please select a board from the sidebar to view tasks.</p>
        <Button onClick={() => { /* Logic to select default board or guide user */ }}>Select a Board</Button>
      </div>
    );
  }

  // --header-height and --board-header-height are conceptual CSS variables for layout calculation
  // Actual values would depend on your header and board header component heights.
  // For this example, let's assume they are defined elsewhere or use fixed pixel values.
  const headerHeight = '4rem'; // Example: 64px
  const boardHeaderHeight = '3.5rem'; // Example: 56px

  return (
    <div className="flex flex-col h-full" style={{ ['--header-height' as any]: headerHeight, ['--board-header-height' as any]: boardHeaderHeight }}>
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h1 className="text-2xl font-semibold font-headline">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Sync</Button>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button size="sm" onClick={() => handleAddTask(currentBoard.columns[0]?.id || 'col-1')}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard 
        board={currentBoard} 
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
