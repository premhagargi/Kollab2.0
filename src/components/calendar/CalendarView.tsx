
// src/components/calendar/CalendarSidebar.tsx
"use client";
import React, { useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TaskPill } from './TaskPill';
import type { Task } from '@/types';
import { format, isSameDay, parseISO, isBefore, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Info, PanelLeftOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface CalendarSidebarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  tasksByDate: Map<string, Task[]>;
  onTaskClick: (task: Task) => void;
  showBillableOnly: boolean;
  onToggleBillable: (checked: boolean) => void;
  className?: string;
  isMinimizedOnDesktop: boolean;
  onExpandCalendar: () => void;
  isMobileView: boolean;
}

export function CalendarSidebar({
  selectedDate,
  onSelectDate,
  tasksByDate,
  onTaskClick,
  showBillableOnly,
  onToggleBillable,
  className,
  isMinimizedOnDesktop,
  onExpandCalendar,
  isMobileView,
}: CalendarSidebarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(selectedDate || new Date());

  React.useEffect(() => {
    if (selectedDate) {
        setCurrentMonth(selectedDate);
    }
  }, [selectedDate]);

  const today = new Date();
  const modifiers = useMemo(() => ({
    urgent: (date: Date) => tasksByDate.get(format(date, 'yyyy-MM-dd'))?.some(t => t.priority === 'urgent' && !t.isCompleted) || false,
    overdue: (date: Date) => (isBefore(date, today) && !isSameDay(date, today)) && (tasksByDate.get(format(date, 'yyyy-MM-dd'))?.some(t => !t.isCompleted) || false),
    hasTasks: (date: Date) => (tasksByDate.get(format(date, 'yyyy-MM-dd'))?.length || 0) > 0,
    selected: selectedDate,
    today: isToday,
  }), [tasksByDate, selectedDate, today]);

  const modifierClassNames = {
    urgent: 'text-red-600 dark:text-red-400 font-bold !bg-red-500/10 dark:!bg-red-500/20 ring-1 ring-red-500/30',
    overdue: 'text-orange-600 dark:text-orange-400 !bg-orange-500/10 dark:!bg-orange-500/20 ring-1 ring-orange-500/30',
    hasTasks: '!font-semibold border-primary/30',
    selected: '!bg-primary !text-primary-foreground ring-2 ring-primary-foreground ring-offset-2 ring-offset-background',
    today: 'border-2 border-primary rounded-md !bg-primary/10',
  };

  const tasksForSelectedDateInSidebar = selectedDate ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];

  if (isMinimizedOnDesktop && !isMobileView) { // isMobileView check added
    return (
      <div className={cn("h-full flex flex-col items-center justify-center p-2 bg-sidebar text-sidebar-foreground border-r border-sidebar-border md:rounded-lg md:shadow-lg", className)}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onExpandCalendar}
                className="h-10 w-10 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Expand Calendar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Expand Calendar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col shadow-lg flex-shrink-0 border-r bg-sidebar text-sidebar-foreground", className)}>
      <CardHeader className="p-3 border-b border-sidebar-border flex-shrink-0">
        <CardDescription className="text-xs text-sidebar-accent-foreground">
          Select a day to view tasks.
        </CardDescription>
         <div className="flex items-center space-x-2 pt-1">
            <Switch
              id="billable-toggle-sidebar"
              checked={showBillableOnly}
              onCheckedChange={onToggleBillable}
            />
            <Label htmlFor="billable-toggle-sidebar" className="text-xs font-normal text-sidebar-accent-foreground">Show Billable Only</Label>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-2 pb-0 border-b border-sidebar-border flex-shrink-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md p-0 w-full"
          classNames={{
            caption_label: "text-sm font-medium text-sidebar-primary",
            head_cell: "w-full text-sidebar-accent-foreground text-[10px] uppercase tracking-wide",
            cell: "h-9 w-9 text-center text-xs p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring/50 transition-colors text-sidebar-foreground",
              "[&:has([aria-selected])]:bg-sidebar-primary [&:has([aria-selected])]:text-sidebar-primary-foreground"
            ),
            day_selected: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground focus:bg-sidebar-primary focus:text-sidebar-primary-foreground",
            day_today: "bg-sidebar-accent text-sidebar-accent-foreground",
            day_outside: "text-sidebar-accent-foreground opacity-30 aria-selected:bg-sidebar-accent/30 aria-selected:text-sidebar-accent-foreground",
            nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"),
          }}
          modifiers={modifiers}
          modifiersClassNames={modifierClassNames}
          components={{
            DayContent: ({ date, activeModifiers }) => (
              <div className="relative flex flex-col items-center justify-center h-full w-full">
                <span className={cn("text-[11px]", activeModifiers.today && "font-bold")}>
                  {format(date, 'd')}
                </span>
                 {activeModifiers.hasTasks && !activeModifiers.selected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-sidebar-primary opacity-70" />
                )}
              </div>
            ),
            IconLeft: () => <ChevronLeft className="h-3 w-3" />,
            IconRight: () => <ChevronRight className="h-3 w-3" />,
          }}
        />
      </CardContent>

      <div className="flex-grow min-h-0 px-2 pt-1 pb-2 flex flex-col">
        <Label className="text-[10px] uppercase text-sidebar-accent-foreground font-semibold px-1 flex-shrink-0">
            Tasks for {selectedDate ? format(selectedDate, 'MMM d') : 'Selected Day'}
        </Label>
        <ScrollArea className="flex-grow mt-0 pr-1">
          {selectedDate && tasksForSelectedDateInSidebar.length > 0 ? (
            <ul className="space-y-1.5">
              {tasksForSelectedDateInSidebar.map(task => (
                <TaskPill key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}
            </ul>
          ) : selectedDate ? (
            <div className="flex flex-col items-center text-center text-sidebar-accent-foreground p-4">
                <Info className="w-5 h-5 mb-2 text-sidebar-primary/40" />
                <p className="text-[11px] font-medium">No tasks for this day.</p>
                {tasksForCurrentWorkflowCalendar.length === 0 && <p className="text-[10px]">No tasks in this workflow.</p> }
                {showBillableOnly && tasksForCurrentWorkflowCalendar.length > 0 && <p className="text-[10px]">Try turning off 'Billable Only'.</p>}
            </div>
          ) : (
             <div className="flex flex-col items-center text-center text-sidebar-accent-foreground p-4">
                <CalendarDays className="w-5 h-5 mb-2 text-sidebar-primary/40" />
                <p className="text-[11px] font-medium">Select a day</p>
                <p className="text-[10px]">to see its tasks here.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
}

// Helper to get tasks for the current workflow from the calendar view
const tasksForCurrentWorkflowCalendar = (tasksByDate: Map<string, Task[]>, currentWorkflowId: string | null): Task[] => {
    if (!currentWorkflowId) return [];
    let allTasks: Task[] = [];
    tasksByDate.forEach(tasksOnDate => {
        allTasks = allTasks.concat(tasksOnDate);
    });
    return allTasks.filter(task => task.workflowId === currentWorkflowId);
};
