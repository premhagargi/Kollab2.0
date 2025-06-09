// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task, UserProfile } from '@/types';
import { mockUser } from '@/lib/mock-data'; // For assignee display
import { CalendarDays, MessageSquare, Paperclip, Users } from 'lucide-react';
import { format } from 'date-fns';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
}

const priorityColors: Record<Task['priority'], string> = {
  low: 'bg-green-500 hover:bg-green-600',
  medium: 'bg-yellow-500 hover:bg-yellow-600',
  high: 'bg-orange-500 hover:bg-orange-600',
  urgent: 'bg-red-500 hover:bg-red-600',
};

export function KanbanTaskCard({ task, onClick }: KanbanTaskCardProps) {
  const assignee = mockUser; // In a real app, find assignee from task.assigneeIds

  return (
    <Card
      className="mb-4 cursor-pointer hover:shadow-lg transition-shadow duration-200 bg-card"
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
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
          {/* Placeholder for attachments count */}
          {/* {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center text-xs text-muted-foreground" title={`${task.attachments.length} attachments`}>
              <Paperclip className="h-3.5 w-3.5 mr-1" />
              <span>{task.attachments.length}</span>
            </div>
          )} */}
        </div>
        {assignee && (
          <Avatar className="h-6 w-6" title={`Assigned to: ${assignee.name}`}>
            <AvatarImage src={assignee.avatarUrl || undefined} alt={assignee.name || 'Assignee'} data-ai-hint="user avatar" />
            <AvatarFallback>{assignee.name ? assignee.name.charAt(0).toUpperCase() : <Users className="h-3 w-3"/>}</AvatarFallback>
          </Avatar>
        )}
      </CardFooter>
    </Card>
  );
}
