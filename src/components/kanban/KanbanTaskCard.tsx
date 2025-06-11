
// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, UserProfile } from '@/types';
import { CalendarDays, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
  creatorProfile?: UserProfile | null; 
  onDragStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
}

const priorityColors: Record<Task['priority'], string> = {
  low: 'bg-green-500 hover:bg-green-600',
  medium: 'bg-yellow-500 hover:bg-yellow-600',
  high: 'bg-orange-500 hover:bg-orange-600',
  urgent: 'bg-red-500 hover:bg-red-600',
};

export function KanbanTaskCard({ task, onClick, creatorProfile, onDragStart }: KanbanTaskCardProps) {
  
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    // Set data-task-id attribute on the draggable element itself
    // event.currentTarget.setAttribute('data-task-id', task.id); // Not strictly needed for onDragStart data, but good for drop target identification
    onDragStart(event, task.id, task.columnId);
  };

  return (
    <Card
      className="mb-4 cursor-grab hover:shadow-lg transition-shadow duration-200 bg-card active:cursor-grabbing"
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true"
      onDragStart={handleDragStart}
      data-task-id={task.id} // Add data-task-id for drop target identification
    >
      <CardHeader className="p-4">
        <CardTitle className="text-base font-semibold leading-tight">{task.title}</CardTitle>
        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center" title={`Due date: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          )}
          <Badge variant="secondary" className={`capitalize text-xs px-2 py-0.5 ${priorityColors[task.priority] || 'bg-gray-400'} text-white`}>
            {task.priority}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {task.comments.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground" title={`${task.comments.length} comments`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>
        {creatorProfile && (
          <Avatar className="h-6 w-6" title={`Created by: ${creatorProfile.name}`}>
            <AvatarImage src={creatorProfile.avatarUrl || undefined} alt={creatorProfile.name || 'Creator'} data-ai-hint="user avatar"/>
            <AvatarFallback>{creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback>
          </Avatar>
        )}
      </CardFooter>
    </Card>
  );
}
