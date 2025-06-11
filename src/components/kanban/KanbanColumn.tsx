
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
        
        // Traverse up to find the draggable task card element (which has data-task-id)
        while (targetElement && !targetElement.dataset.taskId && targetElement.parentElement) {
            targetElement = targetElement.parentElement;
        }
        // If a task card is the target, get its ID, ensure it's not the one being dragged
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
      className="w-80 flex-shrink-0 h-full flex flex-col bg-muted/50 shadow-md" // Reverted width w-72 to w-80, original bg-muted/50
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id}
    >
      <CardHeader className="p-4 border-b"> {/* Reverted p-3 to p-4, removed sticky */}
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold truncate pr-2">{column.name}</CardTitle> {/* Reverted text-base to text-lg */}
          <span className="text-sm text-muted-foreground flex-shrink-0">{tasks.length}</span> {/* Reverted text-xs to text-sm */}
        </div>
      </CardHeader>
      {/* The ScrollArea needs to fill the remaining height of the column card */}
      <ScrollArea className="flex-grow h-[calc(100%-120px)]"> {/* Reverted to fixed height approach for ScrollArea, may need adjustment */}
        <CardContent className="p-3 space-y-3 min-h-[80px]"> {/* Reverted padding and min-h */}
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
            <div className="text-center text-sm text-muted-foreground py-4"> {/* Reverted text-xs to text-sm, py-3 to py-4 */}
              Drag tasks here or click below to add.
            </div>
          )}
        </CardContent>
      </ScrollArea>
      <div className="p-3 border-t mt-auto"> {/* Reverted p-2 to p-3 */}
        <Button variant="ghost" className="w-full justify-start" onClick={() => onAddTask(column.id)}> {/* Reverted size="sm" removal, text-sm removal */}
          <PlusCircle className="h-4 w-4 mr-2" />
          Add task
        </Button>
      </div>
    </Card>
  );
}
