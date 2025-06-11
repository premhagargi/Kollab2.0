
// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, UserProfile } from '@/types';
import { CalendarDays, MessageSquare, Users, GripVertical } from 'lucide-react'; // Added GripVertical
import { format, parseISO } from 'date-fns';

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
  
  const handleDragStartLocal = (event: React.DragEvent<HTMLDivElement>) => {
    onDragStart(event, task.id, task.columnId);
  };

  const stopPropagation = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click when interacting with drag handle
  };


  return (
    <Card
      className="mb-3 cursor-pointer hover:shadow-lg transition-shadow duration-150 bg-card active:shadow-xl" // Reverted mb-2 to mb-3
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true" 
      onDragStart={handleDragStartLocal}
      data-task-id={task.id} // Added data-task-id
    >
      {/* Removed drag handle for whole card dragging */}
      <CardHeader className="p-3 pb-2"> 
        <CardTitle className="text-sm font-medium leading-snug">{task.title}</CardTitle>
        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
      </CardHeader>
      {(task.dueDate || task.priority) && (
        <CardContent className="p-3 pt-1"> 
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.dueDate && (
              <div className="flex items-center" title={`Due date: ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}>
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
              </div>
            )}
            <Badge variant="secondary" className={`capitalize text-xs px-1.5 py-0.5 ${priorityColors[task.priority] || 'bg-gray-400'} text-white`}>
              {task.priority}
            </Badge>
          </div>
        </CardContent>
      )}
      <CardFooter className="p-3 pt-1 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground" title={`${task.comments.length} comments`}>
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>
        {creatorProfile && (
          <Avatar className="h-6 w-6" title={`Created by: ${creatorProfile.name}`}> {/* Reverted h-5 w-5 to h-6 w-6 */}
            <AvatarImage src={creatorProfile.avatarUrl || undefined} alt={creatorProfile.name || 'Creator'} data-ai-hint="user avatar small"/>
            <AvatarFallback className="text-xs">{creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback> {/* Reverted h-2.5 w-2.5 to h-3 w-3 */}
          </Avatar>
        )}
      </CardFooter>
    </Card>
  );
}
