
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
        
        // Determine if the drop target is another task card
        let targetTaskId: string | undefined = undefined;
        let targetElement = event.target as HTMLElement;
        
        // Traverse up to find the task card if dropped on an inner element
        while (targetElement && !targetElement.dataset.taskId && targetElement.parentElement) {
            targetElement = targetElement.parentElement;
        }
        if (targetElement && targetElement.dataset.taskId) {
            targetTaskId = targetElement.dataset.taskId;
        }

        if (draggedTaskId && sourceColumnId) {
          if (column.id === sourceColumnId) { // Dropped in the same column (reordering)
            if (targetTaskId && targetTaskId !== draggedTaskId) {
              onTaskDrop(draggedTaskId, sourceColumnId, column.id, targetTaskId);
            } else if (!targetTaskId) { 
              // Dropped in empty space of same column, append to end (or handle as no-op for now)
              // For simplicity, we can treat dropping in empty space of the same column as a move to the end.
              // Or, if targetTaskId is undefined, pass it and let parent decide.
              onTaskDrop(draggedTaskId, sourceColumnId, column.id, undefined); // Drop at the end if no specific target task
            }
          } else { // Dropped in a different column
            onTaskDrop(draggedTaskId, sourceColumnId, column.id, targetTaskId); // targetTaskId helps place it if dropped on a specific task
          }
        }
      } catch (error) {
        console.error("Error parsing dragged task data:", error);
      }
    }
  };
  
  return (
    <Card 
      className="w-80 flex-shrink-0 h-full flex flex-col bg-muted/50 shadow-md"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id} // For easier identification if needed
    >
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md font-semibold">{column.name}</CardTitle>
          <span className="text-sm text-muted-foreground">{tasks.length}</span>
        </div>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-1 min-h-[100px]"> {/* Ensure min-h for drop area visibility */}
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
            <div className="text-center text-sm text-muted-foreground py-4">
              Drag tasks here or click below to add.
            </div>
          )}
        </CardContent>
      </ScrollArea>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={() => onAddTask(column.id)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add task
        </Button>
      </div>
    </Card>
  );
}
