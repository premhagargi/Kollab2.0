
// src/components/kanban/KanbanColumn.tsx
"use client";
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanTaskCard } from './KanbanTaskCard';
import type { Column, Task, UserProfile } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  creatorProfiles: Record<string, UserProfile | null>;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onTaskDrop: (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => void;
  onDragTaskStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onUpdateColumnName: (columnId: string, newName: string) => void; // New prop
}

export function KanbanColumn({
  column,
  tasks,
  creatorProfiles,
  onTaskClick,
  onAddTask,
  onTaskDrop,
  onDragTaskStart,
  onUpdateColumnName,
}: KanbanColumnProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentEditingName, setCurrentEditingName] = useState(column.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameDisplayClick = () => {
    setCurrentEditingName(column.name); // Reset to current name in case of previous aborted edit
    setIsEditingName(true);
  };

  const handleNameChangeCommit = () => {
    const trimmedName = currentEditingName.trim();
    if (trimmedName && trimmedName !== column.name) {
      onUpdateColumnName(column.id, trimmedName);
    }
    setIsEditingName(false);
    // If trimmedName is empty, it effectively cancels the edit or keeps the old name
    // The parent component (KanbanBoardView) will handle the actual data update and re-render
  };

  const handleNameInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentEditingName(event.target.value);
  };

  const handleNameInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleNameChangeCommit();
    } else if (event.key === 'Escape') {
      setCurrentEditingName(column.name); // Revert to original name
      setIsEditingName(false);
    }
  };
  
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
    <div
      className="w-72 flex-shrink-0 h-full flex flex-col bg-muted/50 rounded-lg shadow-sm" 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-column-id={column.id}
    >
      <div className="sticky top-0 z-10 p-3 border-b border-border bg-muted/70 rounded-t-lg">
        <div className="flex justify-between items-center">
          {isEditingName ? (
            <Input
              ref={nameInputRef}
              value={currentEditingName}
              onChange={handleNameInputChange}
              onBlur={handleNameChangeCommit}
              onKeyDown={handleNameInputKeyDown}
              className="text-sm font-semibold h-8 flex-grow mr-2 border-primary focus:border-primary focus:ring-primary"
              placeholder="Column name"
            />
          ) : (
            <h3
              className="text-sm font-semibold truncate pr-2 text-foreground cursor-pointer hover:bg-accent/10 p-1 -ml-1 rounded"
              onClick={handleNameDisplayClick}
              title="Click to edit column name"
            >
              {column.name}
            </h3>
          )}
          <div className="flex items-center flex-shrink-0">
            <span className="text-xs text-muted-foreground mr-2">{tasks.length}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-accent/20">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleNameDisplayClick} // Also allow editing from dropdown
                >
                  Rename column
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive hover:!text-destructive-foreground focus:!text-destructive-foreground"
                  disabled // Placeholder for delete column
                >
                  Delete column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-grow p-2 min-h-0">
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
              <div className="text-center text-xs text-muted-foreground py-4 px-2 rounded-md border-2 border-dashed border-border">
                Drag tasks here or click "Add a card" below.
              </div>
            )}
          </div>
      </ScrollArea>

      <div className="p-2 border-t border-border mt-auto">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground text-sm" 
          onClick={() => onAddTask(column.id)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add a card
        </Button>
      </div>
    </div>
  );
}
    
