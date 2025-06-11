
// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, UserProfile } from '@/types';
import { CalendarDays, MessageSquare, Users, GripVertical, AlignLeft, CheckSquare } from 'lucide-react'; // Added AlignLeft, CheckSquare
import { format, parseISO } from 'date-fns';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
  creatorProfile?: UserProfile | null; 
  onDragStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
}

// Adjusted priority colors for better visibility on dark cards
const priorityColors: Record<Task['priority'], string> = {
  low: 'bg-green-600 hover:bg-green-700',
  medium: 'bg-yellow-600 hover:bg-yellow-700',
  high: 'bg-orange-600 hover:bg-orange-700',
  urgent: 'bg-red-600 hover:bg-red-700',
};

export function KanbanTaskCard({ task, onClick, creatorProfile, onDragStart }: KanbanTaskCardProps) {
  
  const handleDragStartLocal = (event: React.DragEvent<HTMLDivElement>) => {
    onDragStart(event, task.id, task.columnId);
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <Card
      className="mb-2 cursor-pointer hover:bg-neutral-650 transition-shadow duration-150 bg-neutral-700 text-neutral-100 shadow-md hover:shadow-lg active:shadow-xl rounded-md"
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true" 
      onDragStart={handleDragStartLocal}
      data-task-id={task.id} 
    >
      <CardContent className="p-2.5 space-y-1.5"> 
        {/* Optional: Task label/category (like the green bar in Trello example) */}
        {/* <div className="h-1.5 w-10 bg-green-500 rounded-full mb-1"></div> */}
        
        <p className="text-sm font-normal leading-snug text-neutral-50">{task.title}</p>
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
          {task.dueDate && (
            <div className="flex items-center" title={`Due date: ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
            </div>
          )}
          {task.description && (
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
          {/* Assignee avatars would go here if multiple assignees are supported and data is available */}
          {creatorProfile && (
            <Avatar className="h-6 w-6" title={`Created by: ${creatorProfile.name}`}>
              <AvatarImage src={creatorProfile.avatarUrl || undefined} alt={creatorProfile.name || 'Creator'} data-ai-hint="user avatar small"/>
              <AvatarFallback className="text-xs bg-neutral-600 text-neutral-300">{creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback>
            </Avatar>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

