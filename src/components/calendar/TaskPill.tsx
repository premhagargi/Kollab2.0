
// src/components/calendar/TaskPill.tsx
"use client";
import React from 'react';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { CheckSquare, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { format, parseISO, isBefore, isToday } from 'date-fns';

interface TaskPillProps {
  task: Task;
  onClick: () => void;
}

const priorityClasses: Record<TaskPriority, { border: string; bg: string; text: string, hoverBg: string, indicator: string }> = {
  low: { border: 'border-green-500 dark:border-green-600', bg: 'bg-green-500/5 dark:bg-green-700/10', text: 'text-green-700 dark:text-green-300', hoverBg: 'hover:bg-green-500/10 dark:hover:bg-green-700/20', indicator: 'bg-green-500' },
  medium: { border: 'border-yellow-500 dark:border-yellow-600', bg: 'bg-yellow-500/5 dark:bg-yellow-700/10', text: 'text-yellow-700 dark:text-yellow-300', hoverBg: 'hover:bg-yellow-500/10 dark:hover:bg-yellow-700/20', indicator: 'bg-yellow-500' },
  high: { border: 'border-orange-500 dark:border-orange-600', bg: 'bg-orange-500/5 dark:bg-orange-700/10', text: 'text-orange-700 dark:text-orange-300', hoverBg: 'hover:bg-orange-500/10 dark:hover:bg-orange-700/20', indicator: 'bg-orange-500' },
  urgent: { border: 'border-red-500 dark:border-red-600', bg: 'bg-red-500/5 dark:bg-red-700/10', text: 'text-red-700 dark:text-red-300', hoverBg: 'hover:bg-red-500/10 dark:hover:bg-red-700/20', indicator: 'bg-red-500' },
};

export function TaskPill({ task, onClick }: TaskPillProps) {
  const isTaskOverdue = task.dueDate && isBefore(parseISO(task.dueDate), new Date()) && !isToday(parseISO(task.dueDate)) && !task.isCompleted;
  const priorityStyle = priorityClasses[task.priority];

  return (
    <li
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-md border cursor-pointer transition-all duration-150 ease-in-out shadow-sm hover:shadow-md group relative pl-4", // Added pl-4 for indicator space
        priorityStyle.border, // Using left border for priority
        priorityStyle.bg,
        priorityStyle.hoverBg,
        task.isCompleted && "opacity-70 bg-gray-500/10 dark:bg-gray-700/20 border-gray-400 dark:border-gray-500"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`Task: ${task.title}`}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-md", priorityStyle.indicator)}></div>
      <div className="flex items-center justify-between">
        <h4 className={cn(
            "text-sm font-medium truncate pr-2", 
            priorityStyle.text, 
            task.isCompleted && "line-through text-muted-foreground"
            )}>
          {task.title}
        </h4>
        <div className="flex items-center space-x-2 flex-shrink-0">
            {task.isBillable && <DollarSign className="h-3.5 w-3.5 text-primary/70" titleAccess="Billable Task"/>}
            {task.isCompleted && <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />}
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5 text-xs">
        <div className={cn("flex items-center space-x-2", priorityStyle.text, task.isCompleted && "text-muted-foreground")}>
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {task.dueDate ? format(parseISO(task.dueDate), 'p') : 'No time set'}
          </div>
        </div>
        {isTaskOverdue && (
          <div className="flex items-center text-red-600 dark:text-red-400 font-semibold" title="Overdue">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            <span>Overdue</span>
          </div>
        )}
      </div>
    </li>
  );
}
