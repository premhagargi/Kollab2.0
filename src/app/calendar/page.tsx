
// src/app/calendar/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import type { Task, Workflow } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { getAllTasksByOwner, updateTask, archiveTask as archiveTaskService } from '@/services/taskService';
import { getWorkflowsByOwner, createWorkflow } from '@/services/workflowService';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { Loader2, LogIn, LayoutList, Calendar as CalendarIconLucide, Info, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { TaskPill } from '@/components/calendar/TaskPill';
import { TaskDetailsModal } from '@/components/modals/TaskDetailsModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function CalendarPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [userWorkflows, setUserWorkflows] = React.useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = React.useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default to today
  const [showBillableOnly, setShowBillableOnly] = useState(false);
  const [isCalendarSidebarOpen, setIsCalendarSidebarOpen] = useState(true); // Default to open for discoverability

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingWorkflows(true);
      getWorkflowsByOwner(user.id)
        .then(workflows => setUserWorkflows(workflows))
        .catch(error => {
          console.error("Error fetching workflows:", error);
          toast({ title: "Error", description: "Could not load workflows.", variant: "destructive" });
        })
        .finally(() => setIsLoadingWorkflows(false));

      setIsLoadingTasks(true);
      getAllTasksByOwner(user.id)
        .then(tasks => {
          setAllTasks(tasks.filter(task => task.dueDate)); // Only tasks with due dates for calendar
        })
        .catch(err => {
          console.error("Error fetching tasks for calendar:", err);
          toast({ title: "Error", description: "Could not load tasks for calendar.", variant: "destructive" });
        })
        .finally(() => setIsLoadingTasks(false));

    } else if (!user && !authLoading) {
      setUserWorkflows([]);
      setIsLoadingWorkflows(false);
      setAllTasks([]);
      setIsLoadingTasks(false);
    }
  }, [user, authLoading, toast]);

  const handleWorkflowCreated = async (newWorkflowName: string, templateName?: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a workflow.", variant: "destructive" });
      return null;
    }
    try {
      const newWorkflow = await createWorkflow(user.id, newWorkflowName, templateName);
      setUserWorkflows(prev => [...prev, newWorkflow]);
      toast({ title: "Workflow Created", description: `Workflow "${newWorkflow.name}" created.` });
      router.push(`/?workflowId=${newWorkflow.id}`);
      return newWorkflow.id;
    } catch (error) {
      console.error("Error creating workflow from calendar page:", error);
      toast({ title: "Error", description: "Failed to create workflow.", variant: "destructive" });
      return null;
    }
  };

  const handleSelectWorkflowForHeader = (workflowId: string) => {
    router.push(`/?workflowId=${workflowId}`);
  };

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

  const tasksForSelectedDateInMainView = useMemo(() => {
    return selectedDate ? tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [] : [];
  }, [selectedDate, tasksByDate]);


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
      console.error("Error updating task from calendar page:", error);
    }
  };

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user) return;
    try {
      await archiveTaskService(taskToArchive.id);
      setAllTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
      if (selectedTaskForModal?.id === taskToArchive.id) {
        setIsTaskModalOpen(false);
        setSelectedTaskForModal(null);
      }
    } catch (error) {
      toast({ title: "Archive Failed", description: "Unable to archive task.", variant: "destructive" });
      console.error("Error archiving task from calendar page:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader
            workflows={[]}
            currentWorkflowId={null}
            onSelectWorkflow={() => {}}
            onWorkflowCreated={async () => null}
            isLoadingWorkflows={true}
        />
        <main className="flex-1 flex items-center justify-center pt-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!user) {
     return (
       <div className="flex flex-col min-h-screen">
         <AppHeader
            workflows={[]}
            currentWorkflowId={null}
            onSelectWorkflow={() => {}}
            onWorkflowCreated={async () => null}
            isLoadingWorkflows={true}
         />
         <main className="flex-1 flex flex-col items-center justify-center text-center pt-16 p-4">
            <LogIn className="h-16 w-16 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Please Log In</h2>
            <p className="text-muted-foreground max-w-md">
              To view your calendar and manage your tasks, you need to be logged in.
            </p>
         </main>
       </div>
     );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        workflows={userWorkflows}
        currentWorkflowId={null} // Calendar page doesn't have a "current workflow" concept in header
        onSelectWorkflow={handleSelectWorkflowForHeader}
        onWorkflowCreated={handleWorkflowCreated}
        isLoadingWorkflows={isLoadingWorkflows}
      />
      <main className="flex-1 flex overflow-hidden pt-16">
        {/* Main Task Display Area */}
        <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto">
          <Card className="shadow-lg rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-xl font-semibold flex items-center">
                  <LayoutList className="mr-3 h-5 w-5 text-primary" />
                  Tasks for {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Today'}
                </CardTitle>
                <CardDescription>
                  {selectedDate && isSameDay(selectedDate, new Date()) 
                    ? "What's on your plate today?" 
                    : `Tasks scheduled for ${selectedDate ? format(selectedDate, 'MMMM d') : ''}`}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="billable-toggle-main" className="text-sm font-medium text-muted-foreground">Billable Only</Label>
                  <Switch
                    id="billable-toggle-main"
                    checked={showBillableOnly}
                    onCheckedChange={setShowBillableOnly}
                    size="sm"
                  />
                </div>
                <Sheet open={isCalendarSidebarOpen} onOpenChange={setIsCalendarSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                      {isCalendarSidebarOpen ? 'Hide Calendar' : 'Show Calendar'}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                     <CalendarSidebar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        tasksByDate={tasksByDate} // Pass the memoized map
                        onTaskClick={handleTaskClick} // Pass handler
                        showBillableOnly={showBillableOnly}
                        onToggleBillable={setShowBillableOnly}
                     />
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingTasks ? (
                 <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : tasksForSelectedDateInMainView.length > 0 ? (
                <ScrollArea className="max-h-[calc(100vh-20rem)]"> {/* Adjust height as needed */}
                  <ul className="space-y-2 pr-3">
                    {tasksForSelectedDateInMainView.map(task => (
                      <TaskPill key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-4 border-2 border-dashed rounded-lg">
                  <Info className="w-12 h-12 mb-4 text-primary/30" />
                  <p className="text-lg font-medium">No tasks for this day.</p>
                  <p className="text-sm">
                    {showBillableOnly ? "Try turning off 'Billable Only' filter or " : ""}
                    Select another day on the calendar.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
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

export default function CalendarPage() {
  return (
    <AuthProvider>
      <CalendarPageContent />
    </AuthProvider>
  );
}
