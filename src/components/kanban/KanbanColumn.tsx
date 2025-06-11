
// src/components/kanban/KanbanColumn.tsx
"use client";
import React from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanTaskCard } from './KanbanTaskCard';
import type { Column, Task, UserProfile } from '@/types';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  creatorProfiles: Record<string, UserProfile | null>;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onTaskDrop: (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => void;
  onDragTaskStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
}

export function KanbanColumn({ column, tasks, creatorProfiles, onTaskClick, onAddTask, onTaskDrop, onDragTaskStart }: KanbanColumnProps) {
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const taskDataString = event.dataTransfer.getData('application/json');
    if (taskDataString) {
      try {
        const { taskId: draggedTaskId, sourceColumnId } = JSON.parse(taskDataString);
        
        let targetTaskId: string | undefined = undefined;
        let targetElement = event.target as HTMLElement;
        
        while (targetElement && !targetElement.dataset.taskId && targetElement.parentElement) {
            targetElement = targetElement.parentElement;
        }
        if (targetElement && targetElement.dataset.taskId && targetElement.dataset.taskId !== draggedTaskId) {
            targetTaskId = targetElement.dataset.taskId;
        }

        if (draggedTaskId && sourceColumnId) {
          onTaskDrop(draggedTaskId, sourceColumnId, column.id, targetTaskId);
        }
      } catch (error) {
        console.error("Error parsing dragged task data:", error);
      }
    }
  };
  
  return (
    <Card 
      className="w-72 flex-shrink-0 h-full flex flex-col bg-muted/60 shadow-md" // Reduced width to w-72, slightly more muted bg
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id}
    >
      <CardHeader className="p-3 border-b sticky top-0 bg-muted/80 z-10"> {/* Reduced padding */}
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-semibold truncate pr-2">{column.name}</CardTitle> {/* Truncate title */}
          <span className="text-xs text-muted-foreground flex-shrink-0">{tasks.length}</span>
        </div>
      </CardHeader>
      {/* The ScrollArea needs to fill the remaining height of the column card */}
      <ScrollArea className="flex-grow"> {/* Removed fixed height, let flexbox handle it */}
        <CardContent className="p-2 space-y-2 min-h-[60px]"> {/* Reduced padding and min-h */}
          {tasks.map((task) => (
            <KanbanTaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              creatorProfile={creatorProfiles[task.creatorId] || null}
              onDragStart={onDragTaskStart}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-3">
              Drag tasks here or click below to add.
            </div>
          )}
        </CardContent>
      </ScrollArea>
      <div className="p-2 border-t mt-auto"> {/* Ensure add task button is at the bottom */}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => onAddTask(column.id)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add task
        </Button>
      </div>
    </Card>
  );
}
