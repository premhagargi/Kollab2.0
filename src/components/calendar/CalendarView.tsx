
// src/components/calendar/CalendarSidebar.tsx
// Renamed from CalendarView.tsx to reflect its new role
"use client";
import React, { useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TaskPill } from './TaskPill';
import type { Task } from '@/types';
import { format, isSameDay, parseISO, isBefore, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Info, SlidersHorizontal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // For sidebar header
import { cn } from '@/lib/utils';

interface CalendarSidebarProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  tasksByDate: Map<string, Task[]>; // Tasks pre-filtered by billable status if needed
  onTaskClick: (task: Task) => void;
  showBillableOnly: boolean;
  onToggleBillable: (checked: boolean) => void;
}

export function CalendarSidebar({
  selectedDate,
  onSelectDate,
  tasksByDate,
  onTaskClick,
  showBillableOnly,
  onToggleBillable,
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
    hasTasks: '!font-semibold border-primary/30', // Make day number bold if it has tasks
    selected: '!bg-primary !text-primary-foreground ring-2 ring-primary-foreground ring-offset-2 ring-offset-primary',
    today: 'border-2 border-primary rounded-md !bg-primary/10',
  };
  
  const tasksForSelectedDateInSidebar = selectedDate ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-4 border-b">
        <SheetTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/> Calendar & Daily Tasks</SheetTitle>
        <SheetDescription>
          Select a day to view its tasks. Toggle billable filter below.
        </SheetDescription>
         <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="billable-toggle-sidebar"
              checked={showBillableOnly}
              onCheckedChange={onToggleBillable}
              size="sm"
            />
            <Label htmlFor="billable-toggle-sidebar" className="text-sm font-normal text-muted-foreground">Show Billable Only</Label>
        </div>
      </SheetHeader>

      <div className="p-3 border-b">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="rounded-md p-0 w-full" // Full width calendar
          classNames={{
            caption_label: "text-base font-medium",
            head_cell: "w-full text-muted-foreground text-xs uppercase tracking-wide",
            cell: "h-10 w-10 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn(
              "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors",
              "[&:has([aria-selected])]:bg-primary [&:has([aria-selected])]:text-primary-foreground"
            ),
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-30 aria-selected:bg-accent/30 aria-selected:text-muted-foreground",
            nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100"),
          }}
          modifiers={modifiers}
          modifiersClassNames={modifierClassNames}
          components={{
            DayContent: ({ date, activeModifiers }) => (
              <div className="relative flex flex-col items-center justify-center h-full w-full">
                <span className={cn("text-xs", activeModifiers.today && "font-bold")}>
                  {format(date, 'd')}
                </span>
                 {activeModifiers.hasTasks && !activeModifiers.selected && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary opacity-70" />
                )}
              </div>
            ),
            IconLeft: () => <ChevronLeft className="h-4 w-4" />,
            IconRight: () => <ChevronRight className="h-4 w-4" />,
          }}
        />
      </div>
      
      <div className="flex-grow overflow-hidden p-3">
        <Label className="text-xs uppercase text-muted-foreground font-semibold px-1">
            Tasks for {selectedDate ? format(selectedDate, 'MMM d') : 'Selected Day'}
        </Label>
        <ScrollArea className="h-full max-h-[calc(100vh-300px)] pr-1 mt-2"> {/* Adjust max height */}
          {selectedDate && tasksForSelectedDateInSidebar.length > 0 ? (
            <ul className="space-y-1.5">
              {tasksForSelectedDateInSidebar.map(task => (
                <TaskPill key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}
            </ul>
          ) : selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-2 mt-4">
                <Info className="w-6 h-6 mb-2 text-primary/40" />
                <p className="text-xs font-medium">No tasks for this day.</p>
                {showBillableOnly && <p className="text-xs">Try turning off 'Billable Only'.</p>}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-2 mt-4">
                <CalendarDays className="w-6 h-6 mb-2 text-primary/40" />
                <p className="text-xs font-medium">Select a day on the calendar</p>
                <p className="text-xs">to see its tasks here.</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
