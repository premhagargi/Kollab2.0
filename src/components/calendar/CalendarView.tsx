
// src/components/calendar/CalendarView.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TaskDetailsModal } from '@/components/modals/TaskDetailsModal';
import { TaskPill } from './TaskPill';
import type { Task, TaskPriority } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { getAllTasksByOwner, updateTask, archiveTask as archiveTaskService } from '@/services/taskService';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isBefore, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function CalendarView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showBillableOnly, setShowBillableOnly] = useState(false);

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getAllTasksByOwner(user.id)
        .then(tasks => {
          setAllTasks(tasks.filter(task => task.dueDate)); // Only include tasks with due dates
        })
        .catch(err => {
          console.error("Error fetching tasks for calendar:", err);
          toast({ title: "Error", description: "Could not load tasks for calendar.", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [user?.id, toast]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (showBillableOnly && !task.isBillable) return false;
      return true;
    });
  }, [allTasks, showBillableOnly]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(parseISO(task.dueDate), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskForModal(task);
    setIsTaskModalOpen(true);
  };

  const handleUpdateTask = async (updatedTaskData: Task) => {
    if (!user) return;
    try {
      await updateTask(updatedTaskData.id, updatedTaskData);
      setAllTasks(prevTasks => prevTasks.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
      toast({ title: "Task Updated", description: "Changes saved successfully." });
    } catch (error) {
      toast({ title: "Save Failed", description: "Unable to save task changes.", variant: "destructive" });
      console.error("Error updating task from calendar view:", error);
    }
  };

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user) return;
    try {
      await archiveTaskService(taskToArchive.id); // Ensure this service updates isArchived
      setAllTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
      if (selectedTaskForModal?.id === taskToArchive.id) {
        setIsTaskModalOpen(false);
        setSelectedTaskForModal(null);
      }
    } catch (error) {
      toast({ title: "Archive Failed", description: "Unable to archive task.", variant: "destructive" });
      console.error("Error archiving task from calendar view:", error);
    }
  };

  const today = new Date();
  const modifiers = useMemo(() => ({
    urgent: (date: Date) => tasksByDate.get(format(date, 'yyyy-MM-dd'))?.some(t => t.priority === 'urgent' && !t.isCompleted) || false,
    overdue: (date: Date) => (isBefore(date, today) && !isSameDay(date, today)) && (tasksByDate.get(format(date, 'yyyy-MM-dd'))?.some(t => !t.isCompleted) || false),
    hasTasks: (date: Date) => (tasksByDate.get(format(date, 'yyyy-MM-dd'))?.length || 0) > 0,
    selected: selectedDate,
    today: isToday,
  }), [tasksByDate, selectedDate, today]);

  const modifierClassNames = {
    urgent: 'text-red-600 dark:text-red-400 font-bold !bg-red-500/10 dark:!bg-red-500/20',
    overdue: 'text-orange-600 dark:text-orange-400 !bg-orange-500/10 dark:!bg-orange-500/20',
    hasTasks: 'font-semibold',
    selected: '!bg-primary !text-primary-foreground',
    today: 'border-2 border-primary rounded-md',
  };
  
  const tasksForSelectedDate = selectedDate ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold flex items-center">
            <CalendarDays className="mr-3 h-6 w-6 text-primary"/>
            My Calendar
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="billable-toggle" className="text-sm font-medium">Show Billable Only</Label>
            <Switch
              id="billable-toggle"
              checked={showBillableOnly}
              onCheckedChange={setShowBillableOnly}
            />
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="rounded-md border bg-card shadow-sm p-0"
              classNames={{
                caption_label: "text-lg font-medium",
                head_cell: "w-full text-muted-foreground text-sm",
                cell: "w-full h-20 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                  "h-full w-full p-1.5 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                   "[&:has([aria-selected])]:bg-primary [&:has([aria-selected])]:text-primary-foreground"
                ),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
              }}
              modifiers={modifiers}
              modifiersClassNames={modifierClassNames}
              components={{
                DayContent: ({ date, activeModifiers }) => (
                  <div className="flex flex-col items-start justify-start h-full w-full p-1">
                    <span className={cn(
                      "self-end text-xs",
                       activeModifiers.today && "font-bold text-primary"
                    )}>{format(date, 'd')}</span>
                    <div className="mt-0.5 space-y-0.5 w-full overflow-hidden">
                    {(tasksByDate.get(format(date, 'yyyy-MM-dd')) || []).slice(0, 2).map(task => (
                        <div key={task.id} className={cn("text-xs rounded-sm px-1 py-0.5 truncate w-full text-left",
                            task.priority === 'urgent' && !task.isCompleted && "bg-red-500/20 text-red-700 dark:text-red-300",
                            task.priority === 'high' && !task.isCompleted && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                            task.isCompleted && "line-through opacity-60"
                        )}>
                           {task.title}
                        </div>
                    ))}
                    {(tasksByDate.get(format(date, 'yyyy-MM-dd'))?.length || 0) > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                           +{(tasksByDate.get(format(date, 'yyyy-MM-dd'))?.length || 0) - 2} more
                        </div>
                    )}
                    </div>
                  </div>
                ),
                IconLeft: () => <ChevronLeft className="h-5 w-5" />,
                IconRight: () => <ChevronRight className="h-5 w-5" />,
              }}
            />
          </div>
          <div className="md:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg font-semibold">
                  {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden p-3">
                <ScrollArea className="h-full max-h-[calc(100vh-24rem)] pr-3"> {/* Adjusted max height */}
                  {selectedDate && tasksForSelectedDate.length > 0 ? (
                    <ul className="space-y-2">
                      {tasksForSelectedDate.map(task => (
                        <TaskPill key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                      ))}
                    </ul>
                  ) : selectedDate ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                        <Info className="w-10 h-10 mb-3 text-primary/50" />
                        <p className="text-sm font-medium">No tasks scheduled for this day.</p>
                        <p className="text-xs">Try selecting another day or adjusting your filters.</p>
                    </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                        <CalendarDays className="w-10 h-10 mb-3 text-primary/50" />
                        <p className="text-sm font-medium">Click a day on the calendar</p>
                        <p className="text-xs">to see scheduled tasks and events.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {selectedTaskForModal && (
        <TaskDetailsModal
          task={selectedTaskForModal}
          isOpen={isTaskModalOpen}
          onClose={() => { setIsTaskModalOpen(false); setSelectedTaskForModal(null); }}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
        />
      )}
    </div>
  );
}
