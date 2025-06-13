
// src/app/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Card } from '@/components/ui/card'; // Added import for Card

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [userWorkflows, setUserWorkflows] = useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const { toast } = useToast();

  // Calendar State
  const [isCalendarSidebarVisible, setIsCalendarSidebarVisible] = useState(true); // Default to visible
  const [allUserTasks, setAllUserTasks] = useState<Task[]>([]);
  const [isLoadingAllTasks, setIsLoadingAllTasks] = useState(false);
  const [selectedDateForCalendar, setSelectedDateForCalendar] = useState<Date | undefined>(new Date());
  const [showBillableOnlyCalendar, setShowBillableOnlyCalendar] = useState(false);

  // Task Modal State (centralized)
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const provisionalNewTaskIdRef = useRef<string | null>(null); // For tasks added via Kanban

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingWorkflows(true);
      getWorkflowsByOwner(user.id)
        .then(workflows => {
          setUserWorkflows(workflows);
          if (workflows.length > 0 && !currentWorkflowId) {
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
          setAllUserTasks(tasks.filter(task => task.dueDate)); // Filter for calendar view
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
  }, [user, authLoading, currentWorkflowId, toast]);


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
      // Refetch all tasks if sample tasks were created
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
      // Update in allUserTasks (for calendar)
      setAllUserTasks(prevTasks => prevTasks.map(t => t.id === updatedTaskData.id ? updatedTaskData : t));
      // KanbanBoardView will update its own task list if the task belongs to the current workflow
      // This might require passing a callback to KanbanBoardView to inform it of updates
      // Or KanbanBoardView re-filters its tasks from a prop if `allUserTasks` is passed down and filtered there.
      // For now, we rely on KanbanBoardView re-fetching or its internal update logic for tasks specific to its workflow.
      // TODO: Ensure KanbanBoardView also reflects this update if the task is in its current view.
      // A simple way is to refetch workflow tasks if currentWorkflowId matches updatedTaskData.workflowId
      // OR pass allUserTasks to Kanban and let it filter.
      
      toast({ title: "Task Updated", description: "Changes saved successfully." });
      if (provisionalNewTaskIdRef.current === updatedTaskData.id) {
        provisionalNewTaskIdRef.current = null; // Clear provisional flag after successful save
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
      // Remove from allUserTasks (for calendar)
      setAllUserTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
      // TODO: Ensure KanbanBoardView also reflects this update.
      // Similar to update, Kanban needs to know its task is gone.
      
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
     // Logic for deleting provisional new task if closed without changes could be added here,
     // similar to how it was in KanbanBoardView, but now managed centrally.
     // For now, just closes.
    setIsTaskModalOpen(false);
    setSelectedTaskForModal(null);
    provisionalNewTaskIdRef.current = null;
  };

  const filteredTasksForCalendar = useMemo(() => {
    return allUserTasks.filter(task => {
      if (showBillableOnlyCalendar && !task.isBillable) return false;
      return true; // Add other filters if needed
    });
  }, [allUserTasks, showBillableOnlyCalendar]);

  const tasksByDateForCalendar = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasksForCalendar.forEach(task => {
      if (task.dueDate) { // Should always be true due to initial filter
        const dateKey = format(parseISO(task.dueDate), 'yyyy-MM-dd');
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasksForCalendar]);
  
  return (
      <div className="flex flex-col h-screen">
        <AppHeader 
            workflows={userWorkflows}
            currentWorkflowId={currentWorkflowId}
            onSelectWorkflow={handleSelectWorkflow}
            onWorkflowCreated={handleWorkflowCreated}
            isLoadingWorkflows={isLoadingWorkflows}
            onToggleCalendarSidebar={toggleCalendarSidebar}
            isCalendarSidebarVisible={isCalendarSidebarVisible}
        />
        <main className="flex-1 flex overflow-hidden bg-background min-h-0 pt-16 p-4"> {/* pt-16 for AppHeader height, p-4 for overall spacing */}
          {user && ( // Only show calendar sidebar if user is logged in
            <CalendarSidebar
              className={cn(
                "transition-all duration-300 ease-in-out transform", // Added transform for smoother transition with margin
                isCalendarSidebarVisible ? "w-[350px] opacity-100" : "w-0 opacity-0 -ml-[350px]"
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
            "flex-1 flex flex-col overflow-hidden min-h-0 rounded-xl shadow-lg", // Card styles for Kanban area
            isCalendarSidebarVisible && user && "ml-4" // Margin when calendar is visible and user is logged in
          )}>
            {authLoading || (isLoadingWorkflows && user) ? (
                <div className="flex flex-1 items-center justify-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : currentWorkflowId && user ? ( // Ensure user is present for KanbanBoardView
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
                  Create your first workflow! Use the "Workflows" menu in the header.
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
      <DashboardContent />
    </AuthProvider>
  );
}
