// src/components/kanban/KanbanTaskCard.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Task, UserProfile, TaskPriority } from '@/types';
import { CalendarDays, MessageSquare, Users, AlignLeft, CheckSquare as CheckSquareIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface KanbanTaskCardProps {
  task: Task;
  onClick: () => void;
  creatorProfile?: UserProfile | null; 
  onDragStart: (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => void;
  onToggleTaskCompleted: (taskId: string, completed: boolean) => void;
}

const priorityBorderColor: Record<TaskPriority, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-500',
};

// These priorityAccentColor might not be used anymore or could be simplified if we don't apply specific bg to metadata
const priorityAccentColor: Record<TaskPriority, string> = {
  low: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30',
  medium: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30',
  high: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700/30',
  urgent: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30',
};

export function KanbanTaskCard({ task, onClick, creatorProfile, onDragStart, onToggleTaskCompleted }: KanbanTaskCardProps) {
  
  const handleDragStartLocal = (event: React.DragEvent<HTMLDivElement>) => {
    onDragStart(event, task.id, task.columnId);
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  const handleCheckboxClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const hasMetadata = task.dueDate || 
                     (task.description && task.description.trim() !== '') || 
                     totalSubtasks > 0 || 
                     (task.comments && task.comments.length > 0);

  const shouldShowFooter = creatorProfile || task.assigneeIds?.length;

  return (
    <Card
      className={cn(
        "mb-2 hover:shadow-lg transition-all duration-200 bg-card border border-border shadow-sm active:shadow-xl rounded-lg group cursor-pointer select-none",
        "border-l-4 hover:border-border/70", 
        priorityBorderColor[task.priority],
        task.isCompleted && "opacity-60", // Removed bg-gray-50, bg-card will be the base
        "hover:scale-[1.01] hover:-translate-y-0.5"
      )}
      onClick={onClick}
      aria-label={`Task: ${task.title}`}
      draggable="true" 
      onDragStart={handleDragStartLocal}
      data-task-id={task.id} 
    >
      <CardContent className={cn(
        "p-2", 
        !hasMetadata && !shouldShowFooter && "pb-2",
        hasMetadata && !shouldShowFooter && "pb-1.5",
        !hasMetadata && shouldShowFooter && "pb-1"
      )}> 
        <div className="flex items-start gap-2">
          <div 
            onClick={handleCheckboxClick} 
            className={cn(
              "flex-shrink-0 transition-all duration-200 ease-in-out",
              "flex items-start justify-center h-5 w-5",
              task.isCompleted ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-110"
            )}
          > 
            <Checkbox
              id={`task-complete-${task.id}`}
              checked={task.isCompleted}
              onCheckedChange={(checked) => {
                onToggleTaskCompleted(task.id, !!checked);
              }}
              className="h-3.5 w-3.5 rounded border-2 border-muted-foreground/50 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 data-[state=checked]:text-primary-foreground hover:border-primary/50 transition-colors"
              aria-label={`Mark task ${task.title} as ${task.isCompleted ? 'incomplete' : 'complete'}`}
            />
          </div>

          <div className="flex-grow min-w-0">
            <p className={cn(
              "text-sm font-semibold leading-[1.2] text-card-foreground cursor-pointer",
              "line-clamp-2 break-words hyphens-auto",
              task.isCompleted && "line-through text-muted-foreground"
            )}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}
            title={task.title.length > 60 ? task.title : undefined}
            >
              {task.title}
            </p>
          </div>
        </div>
        
        {hasMetadata && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1.5 ml-5.5">
            {task.dueDate && (
              <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded-full" 
                   title={`Due date: ${format(parseISO(task.dueDate), 'MMM d, yyyy')}`}>
                <CalendarDays className="h-2.5 w-2.5" />
                <span className="font-medium text-[10px]">{format(parseISO(task.dueDate), 'MMM d')}</span>
              </div>
            )}
            
            {task.description && task.description.trim() !== '' && (
               <div className="flex items-center" title="Has description">
                 <AlignLeft className="h-2.5 w-2.5 text-muted-foreground" />
               </div>
            )}
            
            {totalSubtasks > 0 && (
              <div className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.5 rounded-full text-blue-700 dark:text-blue-300" 
                   title={`${completedSubtasks} of ${totalSubtasks} subtasks completed`}>
                <CheckSquareIcon className="h-2.5 w-2.5" />
                <span className="font-medium text-[10px]">{completedSubtasks}/{totalSubtasks}</span>
              </div>
            )}
            
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center gap-1 bg-purple-500/10 dark:bg-purple-500/20 px-1.5 py-0.5 rounded-full text-purple-700 dark:text-purple-300" 
                   title={`${task.comments.length} comments`}>
                <MessageSquare className="h-2.5 w-2.5" />
                <span className="font-medium text-[10px]">{task.comments.length}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      {shouldShowFooter && (
        <CardFooter className="px-2 py-1.5 border-t border-border/50 bg-muted/30 flex justify-between items-center rounded-b-lg">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              task.priority === 'low' && "bg-green-500",
              task.priority === 'medium' && "bg-yellow-500", 
              task.priority === 'high' && "bg-orange-500",
              task.priority === 'urgent' && "bg-red-500"
            )} title={`Priority: ${task.priority}`} />
            <span className="text-[10px] text-muted-foreground font-medium capitalize">{task.priority}</span>
          </div>
          
          {creatorProfile && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">by</span>
              <Avatar className="h-5 w-5 ring-1 ring-background shadow-sm" title={`Created by: ${creatorProfile.name}`}>
                <AvatarImage 
                  src={creatorProfile.avatarUrl || undefined} 
                  alt={creatorProfile.name || 'Creator'} 
                  data-ai-hint="user avatar small"
                />
                <AvatarFallback className="text-[10px] bg-primary/80 text-primary-foreground font-semibold">
                  {creatorProfile.name ? creatorProfile.name.charAt(0).toUpperCase() : <Users className="h-2.5 w-2.5"/>}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
