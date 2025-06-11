
// src/components/kanban/KanbanColumn.tsx
"use client";
import React from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // Reverted to Card
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanTaskCard } from './KanbanTaskCard';
import type { Column, Task, UserProfile } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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
    <Card // Reverted to Card from div
      className="w-72 flex-shrink-0 h-full flex flex-col bg-muted/60 shadow-sm" // Adjusted background, removed explicit dark theme classes
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id}
    >
      <CardHeader className="sticky top-0 z-10 p-3 border-b bg-card"> {/* Reverted background to card, adjusted padding */}
        <div className="flex justify-between items-center ">
          <CardTitle className="text-sm font-semibold truncate pr-2">{column.name}</CardTitle> {/* Used CardTitle for consistency */}
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground mr-2">{tasks.length}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-accent/50">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end"> {/* Removed explicit dark theme classes */}
                <DropdownMenuItem 
                  // onClick={() => {/* Handle edit column name */}}
                >
                  Edit column name
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive hover:!text-destructive-foreground focus:!text-destructive-foreground" // Adjusted destructive styling
                  // onClick={() => {/* Handle delete column */}}
                >
                  Delete column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow p-2 min-h-0"> {/* Added min-h-0, adjusted padding */}
        <ScrollArea className="h-full"> {/* Ensured ScrollArea takes full height of CardContent */}
          <div className="space-y-2">
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
              <div className="text-center text-xs text-muted-foreground py-4">
                Drag tasks here or add new.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <div className="p-2 border-t mt-auto"> {/* Reverted to standard border */}
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground text-sm" 
          onClick={() => onAddTask(column.id)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add a card
        </Button>
      </div>
    </Card>
  );
}
    