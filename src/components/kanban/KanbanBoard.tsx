
// src/components/kanban/KanbanBoard.tsx
"use client";
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import type { Column, Task, UserProfile } from '@/types';

interface KanbanBoardProps {
  boardColumns: Column[];
  allTasksForBoard: Task[];
  creatorProfiles: Record<string, UserProfile | null>; 
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onAddColumn: () => void;
  onTaskDrop: (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => void;
}

export function KanbanBoard({ 
  boardColumns, 
  allTasksForBoard, 
  creatorProfiles, 
  onTaskClick, 
  onAddTask, 
  onAddColumn,
  onTaskDrop
}: KanbanBoardProps) {
  
  const getTasksForColumn = (column: Column): Task[] => {
    const tasksInColumn = column.taskIds
      .map(taskId => allTasksForBoard.find(t => t.id === taskId))
      .filter(Boolean) as Task[];
    
    return tasksInColumn.sort((a, b) => {
      return column.taskIds.indexOf(a.id) - column.taskIds.indexOf(b.id);
    });
  };

  const handleDragTaskStart = (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId, sourceColumnId }));
    event.dataTransfer.effectAllowed = "move";
  };
  
  return (
    // Use h-full to take available height from parent in KanbanBoardView
    // Parent (in KanbanBoardView) handles overflow-x and overflow-y
    <div className="flex gap-4 p-4 h-full"> 
      {boardColumns.map((column: Column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={getTasksForColumn(column)}
          creatorProfiles={creatorProfiles}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
          onTaskDrop={onTaskDrop}
          onDragTaskStart={handleDragTaskStart}
        />
      ))}
      <div className="w-72 flex-shrink-0 pt-1"> {/* Adjusted width and added pt-1 for alignment with column headers */}
        <Button 
          variant="ghost" 
          className="w-full h-10 border-dashed border-neutral-600 text-neutral-400 hover:bg-neutral-750 hover:text-neutral-300" 
          onClick={onAddColumn}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add another column
        </Button>
      </div>
    </div>
  );
}

