
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
import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar';

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;
const RESIZE_HANDLE_WIDTH = 8; // Width of the draggable handle in pixels

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
  const [isDesktop, setIsDesktop] = useState(false);

  // State for resizable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizingRef = useRef(false);
  const initialMouseXRef = useRef(0);
  const initialSidebarWidthRef = useRef(0);


  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768); // md breakpoint
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsCalendarSidebarVisible(true); 
    } else {
      setIsCalendarSidebarVisible(false);
    }
  }, [isDesktop]);


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
  }, [user, authLoading, toast, currentWorkflowId]); // Added currentWorkflowId to re-fetch tasks if workflow changes


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
      if (user && currentWorkflowId) {
         getAllTasksByOwner(user.id).then(tasks => setAllUserTasks(tasks.filter(t => t.dueDate)));
      }
    }
    provisionalNewTaskIdRef.current = null;
  };

  const tasksForCalendarFiltered = useMemo(() => {
    if (!currentWorkflowId && !showBillableOnlyCalendar) return allUserTasks; // Show all if no specific workflow and not filtering billable
    return allUserTasks.filter(task => {
      const matchesWorkflow = currentWorkflowId ? task.workflowId === currentWorkflowId : true;
      const matchesBillable = showBillableOnlyCalendar ? task.isBillable : true;
      return matchesWorkflow && matchesBillable;
    });
  }, [allUserTasks, currentWorkflowId, showBillableOnlyCalendar]);

  const tasksByDateForCalendar = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasksForCalendarFiltered.forEach(task => {
      if (task.dueDate) {
        const dateKey = format(parseISO(task.dueDate), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasksForCalendarFiltered]);


  // Resizing logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    initialMouseXRef.current = e.clientX;
    initialSidebarWidthRef.current = sidebarWidth;
    document.body.classList.add('resizing-sidebar');
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const dx = e.clientX - initialMouseXRef.current;
    let newWidth = initialSidebarWidthRef.current + dx;
    newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
    setSidebarWidth(newWidth);
  }, []);

  const handleResizeMouseUp = useCallback(() => {
    isResizingRef.current = false;
    document.body.classList.remove('resizing-sidebar');
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  }, [handleResizeMouseMove]);

  useEffect(() => {
    return () => { // Cleanup listeners if component unmounts while resizing
      if (isResizingRef.current) {
        handleResizeMouseUp();
      }
    };
  }, [handleResizeMouseUp]);


  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isDesktopSidebarExpanded = isDesktop && isCalendarSidebarVisible;
  const isDesktopSidebarMinimized = isDesktop && !isCalendarSidebarVisible;

  let mainContentMarginLeft = '0px';
  if (isDesktopSidebarExpanded) {
    mainContentMarginLeft = `${sidebarWidth + RESIZE_HANDLE_WIDTH}px`;
  } else if (isDesktopSidebarMinimized) {
    mainContentMarginLeft = '4rem'; // 64px for w-16 minimized sidebar
  }
  

  return (
      <div className="flex flex-col h-screen overflow-hidden">
        <AppHeader
            workflows={userWorkflows}
            currentWorkflowId={currentWorkflowId}
            onSelectWorkflow={handleSelectWorkflow}
            onWorkflowCreated={handleWorkflowCreated}
            isLoadingWorkflows={isLoadingWorkflows}
        />
        <main className="flex-1 flex overflow-hidden bg-background min-h-0 pt-0 md:pt-0 md:p-2 lg:p-4">
          {user && (
            <>
            <CalendarSidebar
              className={cn(
                "transition-opacity duration-300 ease-in-out transform md:shadow-lg md:rounded-lg",
                "bg-sidebar-background border-r border-sidebar-border",
                // Mobile: overlay or hidden
                "fixed md:static z-30 md:z-auto top-16 left-0 h-[calc(100vh-4rem-4rem)]", // Mobile height
                // Desktop: fixed width or minimized
                "md:top-16 md:h-[calc(100vh-4rem)]", // Desktop height (below header)
                isDesktopSidebarExpanded && `md:fixed md:w-[${sidebarWidth}px] opacity-100 translate-x-0`,
                isDesktopSidebarMinimized && "md:static md:w-16 opacity-100 translate-x-0",
                !isDesktop && isCalendarSidebarVisible && "w-full sm:w-4/5 opacity-100 translate-x-0",
                !isDesktop && !isCalendarSidebarVisible && "opacity-0 -translate-x-full w-0"
              )}
              style={isDesktopSidebarExpanded ? { width: `${sidebarWidth}px` } : {}}
              selectedDate={selectedDateForCalendar}
              onSelectDate={setSelectedDateForCalendar}
              tasksByDate={tasksByDateForCalendar}
              onTaskClick={handleTaskClickFromKanbanOrCalendar}
              showBillableOnly={showBillableOnlyCalendar}
              onToggleBillable={setShowBillableOnlyCalendar}
              isMinimizedOnDesktop={isDesktopSidebarMinimized}
              onExpandCalendar={toggleCalendarSidebar} // This toggles visibility state
              isMobileView={!isDesktop}
            />
            {isDesktopSidebarExpanded && (
              <div
                className="resize-handle hidden md:block"
                style={{ left: `${sidebarWidth}px`, top: '4rem', height: 'calc(100vh - 4rem)' }}
                onMouseDown={handleResizeMouseDown}
                onTouchStart={(e) => { /* TODO: Add touch support */ }}
              />
            )}
            </>
          )}
           <Card className={cn(
            "flex-1 flex flex-col overflow-hidden min-h-0 transition-all duration-300 ease-in-out",
            "md:rounded-xl md:shadow-lg",
            "border-0 md:border"
           )}
            style={{ marginLeft: isDesktop ? mainContentMarginLeft : '0px' }}
           >
            {isLoadingWorkflows && user && !currentWorkflowId ? (
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
    