
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
    
    // Ensure the order of tasks matches the order in column.taskIds
    return tasksInColumn.sort((a, b) => {
      return column.taskIds.indexOf(a.id) - column.taskIds.indexOf(b.id);
    });
  };

  const handleDragTaskStart = (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId, sourceColumnId }));
    event.dataTransfer.effectAllowed = "move";
  };
  
  return (
    <ScrollArea className="w-full h-full">
      <div className="flex gap-4 p-4 h-[calc(100vh-var(--header-height)-var(--board-header-height)-2rem)]">
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
        <div className="w-80 flex-shrink-0">
          <Button variant="outline" className="w-full h-12 border-dashed" onClick={onAddColumn}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add another column
          </Button>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
