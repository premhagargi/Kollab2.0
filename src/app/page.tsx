
// src/app/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getWorkflowsByOwner, createWorkflow as createWorkflowService } from '@/services/workflowService';
import { getAllTasksByOwner, updateTask, archiveTask as archiveTaskService } from '@/services/taskService';
import type { Workflow, Task } from '@/types';
import { Loader2, LayoutGrid, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { siteConfig } from '@/config/site';
import { CalendarSidebar } from '@/components/calendar/CalendarView';
import { TaskDetailsModal } from '@/components/modals/TaskDetailsModal';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar'; // New import

function DashboardContentInternal() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [userWorkflows, setUserWorkflows] = useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const { toast } = useToast();

  const [isCalendarSidebarVisible, setIsCalendarSidebarVisible] = useState(false);
  const [allUserTasks, setAllUserTasks] = useState<Task[]>([]);
  const [isLoadingAllTasks, setIsLoadingAllTasks] = useState(false);
  const [selectedDateForCalendar, setSelectedDateForCalendar] = useState<Date | undefined>(new Date());
  const [showBillableOnlyCalendar, setShowBillableOnlyCalendar] = useState(false);

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const provisionalNewTaskIdRef = useRef<string | null>(null);

  // Initialize calendar sidebar visibility based on screen size for desktop
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCalendarSidebarVisible(window.innerWidth >= 768); // md breakpoint
    }
  }, []);


  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/landing');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingWorkflows(true);
      getWorkflowsByOwner(user.id)
        .then(workflows => {
          setUserWorkflows(workflows);
          if (workflows.length > 0 && (!currentWorkflowId || !workflows.find(w => w.id === currentWorkflowId))) {
            setCurrentWorkflowId(workflows[0].id);
          } else if (workflows.length === 0) {
            setCurrentWorkflowId(null);
          }
        })
        .catch(error => {
          console.error("Error fetching workflows for user:", error);
          toast({ title: "Error", description: "Could not load your workflows.", variant: "destructive" });
          setUserWorkflows([]);
          setCurrentWorkflowId(null);
        })
        .finally(() => setIsLoadingWorkflows(false));

      setIsLoadingAllTasks(true);
      getAllTasksByOwner(user.id)
        .then(tasks => {
          setAllUserTasks(tasks.filter(task => task.dueDate)); 
        })
        .catch(err => {
          console.error("Error fetching all tasks for calendar:", err);
          toast({ title: "Error", description: "Could not load tasks for calendar.", variant: "destructive" });
        })
        .finally(() => setIsLoadingAllTasks(false));

    } else if (!user && !authLoading) {
      setUserWorkflows([]);
      setCurrentWorkflowId(null);
      setIsLoadingWorkflows(false);
      setAllUserTasks([]);
      setIsLoadingAllTasks(false);
    }
  // Rerun if user changes or if currentWorkflowId becomes invalid due to workflows update
  }, [user, authLoading, toast]); 


  const handleSelectWorkflow = (workflowId: string) => {
    setCurrentWorkflowId(workflowId);
  };

  const handleWorkflowCreated = async (newWorkflowName: string, templateName?: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a workflow.", variant: "destructive" });
      return null;
    }
    try {
      const newWorkflow = await createWorkflowService(user.id, newWorkflowName, templateName);
      setUserWorkflows(prevWorkflows => [...prevWorkflows, newWorkflow]);
      setCurrentWorkflowId(newWorkflow.id);
      toast({ title: "Workflow Created", description: `Workflow "${newWorkflow.name}" has been created.` });
      if (templateName && templateName !== 'Blank Workflow') {
         getAllTasksByOwner(user.id).then(tasks => setAllUserTasks(tasks.filter(t => t.dueDate)));
      }
      return newWorkflow.id;
    } catch (error) {
      console.error("Error creating workflow from page:", error);
      toast({ title: "Error", description: "Failed to create workflow.", variant: "destructive" });
      return null;
    }
  };

  const toggleCalendarSidebar = () => {
    setIsCalendarSidebarVisible(prev => !prev);
  };

  const handleTaskClickFromKanbanOrCalendar = (task: Task) => {
    setSelectedTaskForModal(task);
    setIsTaskModalOpen(true);
  };
  
  const handleSetProvisionalNewTaskId = (taskId: string | null) => {
    provisionalNewTaskIdRef.current = taskId;
  };

  const handleUpdateTaskInModal = async (updatedTaskData: Task) => {
    if (!user) return;
    try {
      await updateTask(updatedTaskData.id, updatedTaskData);
      setAllUserTasks(prevTasks => prevTasks.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
      // Also update workflowTasks in KanbanBoardView if needed, or rely on re-fetch/prop drill
      toast({ title: "Task Updated", description: "Changes saved successfully." });
      if (provisionalNewTaskIdRef.current === updatedTaskData.id) {
        provisionalNewTaskIdRef.current = null; 
      }
    } catch (error) {
      toast({ title: "Save Failed", description: "Unable to save task changes.", variant: "destructive" });
      console.error("Error updating task from modal:", error);
    }
  };

  const handleArchiveTaskInModal = async (taskToArchive: Task) => {
    if (!user) return;
    try {
      await archiveTaskService(taskToArchive.id);
      setAllUserTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
      // Also update workflowTasks in KanbanBoardView
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
      if (selectedTaskForModal?.id === taskToArchive.id) {
        setIsTaskModalOpen(false);
        setSelectedTaskForModal(null);
      }
    } catch (error) {
      toast({ title: "Archive Failed", description: "Unable to archive task.", variant: "destructive" });
      console.error("Error archiving task from modal:", error);
    }
  };
  
  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskForModal(null);
    if (provisionalNewTaskIdRef.current) {
      // If a provisional new task was being edited and modal closed, refetch tasks for current workflow
      // to ensure KanbanBoardView is up-to-date, as its internal state might not have the full new task.
      if (user && currentWorkflowId) {
        // This might be redundant if KanbanBoardView also updates its own tasks on add,
        // but ensures consistency if modal is closed prematurely.
         getAllTasksByOwner(user.id).then(tasks => setAllUserTasks(tasks.filter(t => t.dueDate)));
      }
    }
    provisionalNewTaskIdRef.current = null;
  };


  const filteredTasksForCalendar = useMemo(() => {
    return allUserTasks.filter(task => {
      if (showBillableOnlyCalendar && !task.isBillable) return false;
      return true; 
    });
  }, [allUserTasks, showBillableOnlyCalendar]);

  const tasksByDateForCalendar = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasksForCalendar.forEach(task => {
      if (task.dueDate) { 
        const dateKey = format(parseISO(task.dueDate), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasksForCalendar]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
      <div className="flex flex-col h-screen overflow-hidden"> {/* Ensure overflow is hidden here */}
        <AppHeader 
            workflows={userWorkflows}
            currentWorkflowId={currentWorkflowId}
            onSelectWorkflow={handleSelectWorkflow}
            onWorkflowCreated={handleWorkflowCreated}
            isLoadingWorkflows={isLoadingWorkflows}
            onToggleCalendarSidebar={toggleCalendarSidebar} // For desktop
            isCalendarSidebarVisible={isCalendarSidebarVisible} // For desktop
        />
        <main className="flex-1 flex overflow-hidden bg-background min-h-0 pt-0 md:pt-0 md:p-2 lg:p-4"> {/* Adjusted padding */}
          {user && (
            <CalendarSidebar
              className={cn(
                "transition-all duration-300 ease-in-out transform fixed md:static z-30 md:z-auto top-16 md:top-auto left-0 shadow-xl md:shadow-lg md:rounded-lg",
                "bg-sidebar-background border-r border-sidebar-border h-[calc(100vh-4rem-4rem)] md:h-full", // Adjust height for bottom nav
                isCalendarSidebarVisible 
                  ? "w-full sm:w-4/5 md:w-[300px] lg:w-[350px] opacity-100 translate-x-0 " 
                  : "w-0 opacity-0 -translate-x-full md:-ml-[300px] lg:-ml-[350px]"
              )}
              selectedDate={selectedDateForCalendar}
              onSelectDate={setSelectedDateForCalendar}
              tasksByDate={tasksByDateForCalendar}
              onTaskClick={handleTaskClickFromKanbanOrCalendar}
              showBillableOnly={showBillableOnlyCalendar}
              onToggleBillable={setShowBillableOnlyCalendar}
            />
          )}
           <Card className={cn(
            "flex-1 flex flex-col overflow-hidden min-h-0 transition-all duration-300 ease-in-out", 
            "md:rounded-xl md:shadow-lg", // Desktop gets rounded corners and shadow
            "border-0 md:border", // No border on mobile, border on desktop
            isCalendarSidebarVisible && user && "md:ml-4" 
          )}>
            {isLoadingWorkflows && user && !currentWorkflowId ? ( // Show loader if workflows are loading and no workflow selected
                <div className="flex flex-1 items-center justify-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : currentWorkflowId && user ? ( 
              <KanbanBoardView 
                workflowId={currentWorkflowId} 
                onTaskClick={handleTaskClickFromKanbanOrCalendar}
                setProvisionalNewTaskId={handleSetProvisionalNewTaskId}
              />
            ) : user ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <LayoutGrid className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-2">No Workflows Yet</h2>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Create your first workflow! Use the menu to get started.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <LogIn className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to {siteConfig.name}</h2>
                <p className="text-muted-foreground mb-4">Please log in to manage your workflows and tasks.</p>
              </div>
            )}
          </Card>
        </main>
        {user && (
            <BottomNavigationBar 
                onToggleCalendar={toggleCalendarSidebar} 
                isCalendarVisible={isCalendarSidebarVisible}
            />
        )}
        {selectedTaskForModal && user && (
          <TaskDetailsModal
            task={selectedTaskForModal}
            isOpen={isTaskModalOpen}
            onClose={handleCloseTaskModal}
            onUpdateTask={handleUpdateTaskInModal}
            onArchiveTask={handleArchiveTaskInModal}
          />
        )}
      </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContentInternal />
    </AuthProvider>
  );
}

