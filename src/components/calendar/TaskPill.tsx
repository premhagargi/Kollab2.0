
// src/components/calendar/TaskPill.tsx
"use client";
import React from 'react';
import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { CheckSquare, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO, isBefore, isToday } from 'date-fns';

interface TaskPillProps {
  task: Task;
  onClick: () => void;
}

const priorityClasses: Record<TaskPriority, { border: string; bg: string; text: string, hoverBg: string }> = {
  low: { border: 'border-green-500 dark:border-green-400', bg: 'bg-green-500/10 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-300', hoverBg: 'hover:bg-green-500/20 dark:hover:bg-green-500/30' },
  medium: { border: 'border-yellow-500 dark:border-yellow-400', bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-300', hoverBg: 'hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30' },
  high: { border: 'border-orange-500 dark:border-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', hoverBg: 'hover:bg-orange-500/20 dark:hover:bg-orange-500/30' },
  urgent: { border: 'border-red-500 dark:border-red-400', bg: 'bg-red-500/10 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', hoverBg: 'hover:bg-red-500/20 dark:hover:bg-red-500/30' },
};

export function TaskPill({ task, onClick }: TaskPillProps) {
  const isTaskOverdue = task.dueDate && isBefore(parseISO(task.dueDate), new Date()) && !isToday(parseISO(task.dueDate)) && !task.isCompleted;
  const priorityStyle = priorityClasses[task.priority];

  return (
    <li
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-lg border-l-4 cursor-pointer transition-all duration-150 ease-in-out shadow-sm hover:shadow-md",
        priorityStyle.border,
        priorityStyle.bg,
        priorityStyle.hoverBg,
        task.isCompleted && "opacity-60 bg-gray-500/10 dark:bg-gray-700/20 border-gray-400 dark:border-gray-500"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`Task: ${task.title}`}
    >
      <div className="flex items-center justify-between">
        <h4 className={cn("text-sm font-semibold truncate", priorityStyle.text, task.isCompleted && "line-through")}>
          {task.title}
        </h4>
        {task.isCompleted && <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400 ml-2 flex-shrink-0" />}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-xs">
        <div className={cn("flex items-center", priorityStyle.text, task.isCompleted && "text-muted-foreground")}>
          <Clock className="h-3 w-3 mr-1" />
          {task.dueDate ? format(parseISO(task.dueDate), 'p') : 'No time set'}
          {task.isBillable && <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary font-medium">Billable</span>}
        </div>
        {isTaskOverdue && (
          <div className="flex items-center text-red-600 dark:text-red-400" title="Overdue">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span>Overdue</span>
          </div>
        )}
      </div>
    </li>
  );
}
