// src/components/kanban/KanbanBoard.tsx
"use client";
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import type { Board, Column, Task } from '@/types';

interface KanbanBoardProps {
  board: Board;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void; // Placeholder
  onAddColumn: () => void; // Placeholder
}

export function KanbanBoard({ board, onTaskClick, onAddTask, onAddColumn }: KanbanBoardProps) {
  const getTasksForColumn = (columnId: string): Task[] => {
    const column = board.columns.find(c => c.id === columnId);
    if (!column) return [];
    return column.taskIds.map(taskId => board.tasks.find(t => t.id === taskId)).filter(Boolean) as Task[];
  };
  
  return (
    <ScrollArea className="w-full h-full">
      <div className="flex gap-4 p-4 h-[calc(100vh-var(--header-height)-var(--board-header-height)-2rem)]"> {/* Adjust height based on surrounding elements */}
        {board.columns.map((column: Column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksForColumn(column.id)}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
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
