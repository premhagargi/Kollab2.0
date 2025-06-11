
// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, UserProfile } from '@/types';
import { CalendarDays, MessageSquare, Users, GripVertical, AlignLeft, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
  creatorProfile?: UserProfile | null; 
  onDragStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
}

const priorityBadgeVariants: Record<Task['priority'], string> = {
  low: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
};


export function KanbanTaskCard({ task, onClick, creatorProfile, onDragStart }: KanbanTaskCardProps) {
  
  const handleDragStartLocal = (event: React.DragEvent<HTMLDivElement>) => {
    onDragStart(event, task.id, task.columnId);
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <Card
      className="mb-2 cursor-pointer hover:shadow-md transition-shadow duration-150 bg-card text-card-foreground shadow-sm active:shadow-lg rounded-md" // Reverted background and text, adjusted shadow
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true" 
      onDragStart={handleDragStartLocal}
      data-task-id={task.id} 
    >
      <CardContent className="p-2.5 space-y-1.5"> 
        
        <p className="text-sm font-medium leading-snug text-foreground">{task.title}</p> {/* Reverted text color */}
        
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.dueDate && (
            <div className="flex items-center" title={`Due date: ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}>
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span>{format(parseISO(task.dueDate), 'MMM d')}</span>
            </div>
          )}
          {task.description && task.description.trim() !== '' && ( // Ensure description is not just empty spaces
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
         {task.priority && (
          <Badge variant="outline" className={`mt-1.5 text-xs ${priorityBadgeVariants[task.priority]}`}>
            {task.priority}
          </Badge>
        )}
      </CardContent>
      
      {(creatorProfile || task.assigneeIds?.length) && (
        <CardFooter className="p-2.5 pt-1.5 flex justify-end items-center">
          {creatorProfile && (
            <Avatar className="h-6 w-6" title={`Created by: ${creatorProfile.name}`}>
              <AvatarImage src={creatorProfile.avatarUrl || undefined} alt={creatorProfile.name || 'Creator'} data-ai-hint="user avatar small"/>
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">{creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback> {/* Reverted avatar fallback style */}
            </Avatar>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
    