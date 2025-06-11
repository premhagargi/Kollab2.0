
// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Task, UserProfile, TaskPriority } from '@/types';
import { CalendarDays, MessageSquare, Users, AlignLeft, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
  creatorProfile?: UserProfile | null; 
  onDragStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
}

const priorityBorderColor: Record<TaskPriority, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};


export function KanbanTaskCard({ task, onClick, creatorProfile, onDragStart }: KanbanTaskCardProps) {
  
  const handleDragStartLocal = (event: React.DragEvent<HTMLDivElement>) => {
    onDragStart(event, task.id, task.columnId);
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <Card
      className={cn(
        "mb-2 cursor-pointer hover:shadow-md transition-shadow duration-150 bg-card text-card-foreground shadow-sm active:shadow-lg rounded-md",
        "border-l-4", // Add a thicker left border for priority
        priorityBorderColor[task.priority] // Apply specific color based on priority
      )}
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true" 
      onDragStart={handleDragStartLocal}
      data-task-id={task.id} 
    >
      <CardContent className="p-2.5 space-y-1.5"> 
        
        <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center" title={`Due date: ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
            </div>
          )}
          {task.description && task.description.trim() !== '' && (
             <AlignLeft className="h-3.5 w-3.5" title="Has description"/>
          )}
          {totalSubtasks > 0 && (
            <div className="flex items-center" title={`${completedSubtasks} of ${totalSubtasks} subtasks completed`}>
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center" title={`${task.comments.length} comments`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      {(creatorProfile || task.assigneeIds?.length) && (
        <CardFooter className="p-2.5 pt-1.5 flex justify-end items-center">
          {creatorProfile && (
            <Avatar className="h-6 w-6" title={`Created by: ${creatorProfile.name}`}>
              <AvatarImage src={creatorProfile.avatarUrl || undefined} alt={creatorProfile.name || 'Creator'} data-ai-hint="user avatar small"/>
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">{creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback>
            </Avatar>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
    
