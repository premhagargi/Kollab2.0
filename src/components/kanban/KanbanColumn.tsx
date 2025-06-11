
// src/components/kanban/KanbanColumn.tsx
"use client";
import React from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    <div // Changed Card to div for more control over styling to match Trello
      className="w-72 flex-shrink-0 h-full flex flex-col bg-neutral-800 rounded-lg shadow-md" 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id}
    >
      {/* Column Header - sticky within the column's flex container */}
      <div className="sticky top-0 z-10 p-3 border-b border-neutral-700 bg-neutral-800 rounded-t-lg">
        <div className="flex justify-between items-center ">
          <h3 className="text-sm font-semibold text-neutral-200 truncate pr-2">{column.name}</h3>
          <div className="flex items-center">
            <span className="text-xs text-neutral-400 mr-2">{tasks.length}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-neutral-700 border-neutral-600 text-neutral-200">
                <DropdownMenuItem 
                  className="hover:!bg-neutral-600 focus:!bg-neutral-600"
                  // onClick={() => {/* Handle edit column name */}}
                >
                  Edit column name
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:!bg-neutral-600 focus:!bg-neutral-600 text-red-400 hover:!text-red-300 focus:!text-red-300"
                  // onClick={() => {/* Handle delete column */}}
                >
                  Delete column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      {/* Scrollable Task List */}
      <ScrollArea className="flex-grow min-h-0"> {/* Use min-h-0 to ensure ScrollArea takes proper height */}
        <div className="p-2 space-y-2"> {/* Content padding for tasks */}
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
            <div className="text-center text-xs text-neutral-500 py-4">
              Drag tasks here or add new.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Task Button Area */}
      <div className="p-2 border-t border-neutral-700 mt-auto rounded-b-lg">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-neutral-400 hover:bg-neutral-750 hover:text-neutral-300 text-sm" 
          onClick={() => onAddTask(column.id)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add a card
        </Button>
      </div>
    </div>
  );
}

