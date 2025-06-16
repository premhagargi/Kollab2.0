
// src/app/page.tsx
"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getWorkflowsByOwner, createWorkflow as createWorkflowService, updateWorkflow as updateWorkflowService, getWorkflowById } from '@/services/workflowService';
import { getAllTasksByOwner, createTask, updateTask as updateTaskService, archiveTask as archiveTaskService, getTasksByWorkflow } from '@/services/taskService';
import type { Workflow, Task, Column } from '@/types';
import { Loader2, LayoutGrid, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { siteConfig } from '@/config/site';
import { CalendarSidebar } from '@/components/calendar/CalendarView';
import { TaskDetailsModal } from '@/components/modals/TaskDetailsModal';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { BottomNavigationBar } from '@/components/layout/BottomNavigationBar';
import { getUsersByIds } from '@/services/userService';
import type { UserProfile } from '@/types';


const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 350; 
const DEFAULT_SIDEBAR_WIDTH = 280;
const DESKTOP_CONTENT_SPACER_WIDTH = 16; 
const RESIZE_HANDLE_WIDTH = DESKTOP_CONTENT_SPACER_WIDTH; 
const SIDEBAR_MARGIN_LEFT_PX = 16; 
const MINIMIZED_DESKTOP_SIDEBAR_WIDTH_PX = 64; 
const HEADER_HEIGHT_PLUS_MARGIN_REM = '5rem'; 
const VIEWPORT_HEIGHT_MINUS_HEADER_AND_MARGINS = 'calc(100vh - 6rem)'; 

function DashboardContentInternal() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
  const [tasksForCurrentWorkflow, setTasksForCurrentWorkflow] = useState<Task[]>([]);
  const [userWorkflows, setUserWorkflows] = useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [isLoadingCurrentWorkflow, setIsLoadingCurrentWorkflow] = useState(false);
  const { toast } = useToast();

  const [isCalendarSidebarVisible, setIsCalendarSidebarVisible] = useState(true);
  const [allUserTasks, setAllUserTasks] = useState<Task[]>([]);
  const [isLoadingAllTasks, setIsLoadingAllTasks] = useState(false);
  const [selectedDateForCalendar, setSelectedDateForCalendar] = useState<Date | undefined>(new Date());
  const [showBillableOnlyCalendar, setShowBillableOnlyCalendar] = useState(false);

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const provisionalNewTaskIdRef = useRef<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizingRef = useRef(false);
  const initialMouseXRef = useRef(0);
  const initialSidebarWidthRef = useRef(0);
  const [taskChangeTrigger, setTaskChangeTrigger] = useState(0);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, UserProfile | null>>({});


  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
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
            setCurrentWorkflow(null);
            setTasksForCurrentWorkflow([]);
          }
        })
        .catch(error => {
          console.error("Error fetching workflows for user:", error);
          toast({ title: "Error", description: "Could not load your workflows.", variant: "destructive" });
        })
        .finally(() => setIsLoadingWorkflows(false));
    } else if (!user && !authLoading) {
      setUserWorkflows([]);
      setCurrentWorkflowId(null);
      setCurrentWorkflow(null);
      setTasksForCurrentWorkflow([]);
      setIsLoadingWorkflows(false);
    }
  }, [user, authLoading, toast]); 

  useEffect(() => {
    if (currentWorkflowId && user?.id) {
      setIsLoadingCurrentWorkflow(true);
      setCreatorProfiles({}); 
      Promise.all([
        getWorkflowById(currentWorkflowId),
        getTasksByWorkflow(currentWorkflowId, user.id) 
      ]).then(async ([workflowData, tasksData]) => {
        if (workflowData && workflowData.ownerId === user.id) {
          setCurrentWorkflow(workflowData);
          const processedTasks = tasksData.map(task => ({
              ...task,
              isCompleted: task.isCompleted || false,
              isBillable: task.isBillable || false,
              clientName: task.clientName || '',
              deliverables: task.deliverables || []
          }));
          setTasksForCurrentWorkflow(processedTasks);

          const allUserIds = new Set<string>();
          processedTasks.forEach(task => {
            if (task.creatorId) allUserIds.add(task.creatorId);
          });
          if (allUserIds.size > 0) {
            const profiles = await getUsersByIds(Array.from(allUserIds));
            const profilesMap: Record<string, UserProfile | null> = {};
            profiles.forEach(p => profilesMap[p.id] = p);
            setCreatorProfiles(profilesMap);
          }

        } else if (workflowData) {
          toast({ title: "Access Denied", description: "You cannot view this workflow.", variant: "destructive" });
          setCurrentWorkflow(null); setTasksForCurrentWorkflow([]);
        } else {
          toast({ title: "Workflow Not Found", variant: "destructive" });
          setCurrentWorkflow(null); setTasksForCurrentWorkflow([]);
        }
      }).catch(error => {
        console.error("Error fetching current workflow details or tasks:", error);
        toast({ title: "Error Loading Workflow", description: "Could not load workflow data.", variant: "destructive" });
      }).finally(() => {
        setIsLoadingCurrentWorkflow(false);
      });
    } else {
      setCurrentWorkflow(null);
      setTasksForCurrentWorkflow([]);
      setIsLoadingCurrentWorkflow(false);
    }
  }, [currentWorkflowId, user?.id, toast, taskChangeTrigger]);


   useEffect(() => {
    if (user && !authLoading) {
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
    } else {
        setAllUserTasks([]);
        setIsLoadingAllTasks(false);
    }
  }, [user, authLoading, toast, taskChangeTrigger]);


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
      setTaskChangeTrigger(prev => prev + 1); 
      return newWorkflow.id;
    } catch (error) {
      console.error("Error creating workflow from page:", error);
      toast({ title: "Error", description: "Failed to create workflow.", variant: "destructive" });
      return null;
    }
  };

  const handleWorkflowSettingsUpdate = (updatedWorkflowData: Partial<Workflow>) => {
    if (currentWorkflow && currentWorkflow.id === updatedWorkflowData.id) {
      setCurrentWorkflow(prev => prev ? { ...prev, ...updatedWorkflowData } : null);
    }
    setUserWorkflows(prevs => prevs.map(w => w.id === updatedWorkflowData.id ? { ...w, ...updatedWorkflowData } : w));
    toast({ title: "Workflow Settings Updated" });
  };

  const toggleCalendarSidebar = () => {
    setIsCalendarSidebarVisible(prev => !prev);
  };

  const handleTaskClickFromKanbanOrCalendar = (task: Task) => {
    setSelectedTaskForModal({...task}); 
    setIsTaskModalOpen(true);
  };

  const handleSetProvisionalNewTaskId = (taskId: string | null) => {
    provisionalNewTaskIdRef.current = taskId;
  };

  const handleUpdateTaskInModal = async (updatedTaskData: Task) => {
    if (!user) return;

    // Optimistic UI update for both lists
    setAllUserTasks(prevTasks => prevTasks.map(t => t.id === updatedTaskData.id ? { ...t, ...updatedTaskData } : t).filter(Boolean) as Task[]);
    if (currentWorkflow && updatedTaskData.workflowId === currentWorkflow.id) {
      setTasksForCurrentWorkflow(prevTasks => prevTasks.map(t => t.id === updatedTaskData.id ? { ...t, ...updatedTaskData } : t));
    }
    
    // If this was a provisionally new task, clear the provisional ID
    if (provisionalNewTaskIdRef.current === updatedTaskData.id) {
      provisionalNewTaskIdRef.current = null; 
    }

    try {
      await updateTaskService(updatedTaskData.id, updatedTaskData);
      // Success toast if needed, e.g., "Task auto-saved"
    } catch (error) {
      toast({ title: "Save Failed", description: "Unable to save task changes to the server.", variant: "destructive" });
      console.error("Error updating task from modal (background save):", error);
      setTaskChangeTrigger(prev => prev + 1); // Trigger a re-fetch on error to ensure consistency
    }
  };

  const handleArchiveTaskInModal = async (taskToArchive: Task) => {
    if (!user || !currentWorkflow) return;

    // Optimistic UI Update
    setAllUserTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    setTasksForCurrentWorkflow(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));

    const updatedColumns = currentWorkflow.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    // Update currentWorkflow state optimistically
    setCurrentWorkflow(prev => prev ? { ...prev, columns: updatedColumns, updatedAt: new Date().toISOString() } : null);
    
    // Close modal immediately
    if (selectedTaskForModal?.id === taskToArchive.id) {
        handleCloseTaskModal(); 
    }

    try {
      await archiveTaskService(taskToArchive.id);
      // Persist column changes (taskIds) to workflow
      await updateWorkflowService(currentWorkflow.id, { columns: updatedColumns });
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
      // No taskChangeTrigger increment needed as local state is managed, KanbanBoardView should re-render based on prop changes
    } catch (error) {
      toast({ title: "Archive Failed", description: "Unable to archive task on the server.", variant: "destructive" });
      console.error("Error archiving task from modal:", error);
      setTaskChangeTrigger(prev => prev + 1); // Revert optimistic UI updates by triggering a full refresh
    }
  };

  const handleCloseTaskModal = () => {
    setTimeout(() => { 
      setIsTaskModalOpen(false);
      setSelectedTaskForModal(null);
      if (provisionalNewTaskIdRef.current) {
        setTaskChangeTrigger(prev => prev + 1); 
      }
      provisionalNewTaskIdRef.current = null;
    }, 0);
  };
  
  const handleAddTaskToWorkflow = async (columnId: string, taskTitle: string) => {
    if (!user || !currentWorkflow) return null;
    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'isBillable' | 'clientName' | 'deliverables'> & { ownerId: string } = {
      title: taskTitle,
      description: '', priority: 'medium', subtasks: [], comments: [],
      workflowId: currentWorkflow.id, columnId, creatorId: user.id, ownerId: user.id,
      isArchived: false,
    };
    try {
      const createdTask = await createTask(newTaskData);
      
      setTasksForCurrentWorkflow(prev => [...prev, createdTask]);
      setAllUserTasks(prev => [...prev, createdTask]); 
      
      const updatedColumns = currentWorkflow.columns.map(col => 
        col.id === columnId ? { ...col, taskIds: [...col.taskIds, createdTask.id] } : col
      );
      
      setCurrentWorkflow(prevWorkflow => {
        if (!prevWorkflow) {
            console.error("setCurrentWorkflow called in handleAddTaskToWorkflow but prevWorkflow is null.");
            // This case should ideally not happen if currentWorkflow is properly set before this function is called.
            // Returning null or some default state might be necessary, or trigger a re-fetch of workflow.
            return null; 
        }
        return { ...prevWorkflow, columns: updatedColumns, updatedAt: new Date().toISOString() };
      });

      // No need to await this, UI is optimistic
      updateWorkflowService(currentWorkflow.id, { columns: updatedColumns });
      
      provisionalNewTaskIdRef.current = createdTask.id;
      handleTaskClickFromKanbanOrCalendar(createdTask); 

      if (createdTask.creatorId && !creatorProfiles[createdTask.creatorId]) {
        getUsersByIds([createdTask.creatorId]).then(profile => {
          if (profile.length > 0) {
            setCreatorProfiles(prev => ({ ...prev, [createdTask.creatorId!]: profile[0] }));
          }
        });
      }
      return createdTask;
    } catch (error) {
      console.error("Error in handleAddTaskToWorkflow:", error);
      toast({ title: "Error Creating Task", description: "Failed to add the new task to the board.", variant: "destructive" });
      return null;
    }
  };

  const handleMoveTaskInWorkflow = async (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => {
    if (!currentWorkflow || !user) return;
    const taskToMove = tasksForCurrentWorkflow.find(t => t.id === taskId);
    if (!taskToMove) return;

    // Optimistic UI Update for task's columnId
    setTasksForCurrentWorkflow(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, columnId: destinationColumnId, updatedAt: new Date().toISOString() } : t)
    );
    setAllUserTasks(prevTasks => 
      prevTasks.map(t => t.id === taskId ? { ...t, columnId: destinationColumnId, updatedAt: new Date().toISOString() } : t)
    );


    // Optimistic UI Update for column taskIds
    let newWorkflowColumns = JSON.parse(JSON.stringify(currentWorkflow.columns)) as Column[];
    const sourceColIndex = newWorkflowColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newWorkflowColumns.findIndex(col => col.id === destinationColumnId);

    if (sourceColIndex === -1 || destColIndex === -1) return; 

    newWorkflowColumns[sourceColIndex].taskIds = newWorkflowColumns[sourceColIndex].taskIds.filter(id => id !== taskId);
    
    let destTaskIds = [...newWorkflowColumns[destColIndex].taskIds];
    const currentTaskIndexInDest = destTaskIds.indexOf(taskId); 
    if (currentTaskIndexInDest > -1) destTaskIds.splice(currentTaskIndexInDest, 1); 
    
    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;
    if (targetIndexInDest !== -1) {
      destTaskIds.splice(targetIndexInDest, 0, taskId); 
    } else {
      destTaskIds.push(taskId); 
    }
    newWorkflowColumns[destColIndex].taskIds = destTaskIds;
    setCurrentWorkflow(prev => prev ? { ...prev, columns: newWorkflowColumns, updatedAt: new Date().toISOString() } : null);

    try {
      if (sourceColumnId !== destinationColumnId) {
        await updateTaskService(taskId, { columnId: destinationColumnId });
      }
      await updateWorkflowService(currentWorkflow.id, { columns: newWorkflowColumns });
    } catch (error) {
      toast({ title: "Error Moving Task", description: "Failed to save task movement.", variant: "destructive" });
      setTaskChangeTrigger(prev => prev + 1);
    }
  };
  
  const handleUpdateWorkflowColumnName = async (columnId: string, newName: string) => {
    if (!currentWorkflow || !user) return;
    const originalColumns = JSON.parse(JSON.stringify(currentWorkflow.columns)); 
    const updatedColumns = currentWorkflow.columns.map(col => 
      col.id === columnId ? { ...col, name: newName } : col
    );
    setCurrentWorkflow(prev => prev ? { ...prev, columns: updatedColumns, updatedAt: new Date().toISOString() } : null);
    try {
      await updateWorkflowService(currentWorkflow.id, { columns: updatedColumns });
      toast({title: "Column Renamed"});
    } catch (error) {
      setCurrentWorkflow(prev => prev ? { ...prev, columns: originalColumns } : null); 
      toast({ title: "Error Renaming Column", variant: "destructive" });
    }
  };

  const handleToggleWorkflowTaskCompleted = async (taskId: string, isCompleted: boolean) => {
     if (!user) return;
    const newUpdatedAt = new Date().toISOString();
    setTasksForCurrentWorkflow(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted, updatedAt: newUpdatedAt } : t));
    setAllUserTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted, updatedAt: newUpdatedAt } : t));
    
    try {
      await updateTaskService(taskId, { isCompleted });
    } catch (error) {
      setTasksForCurrentWorkflow(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !isCompleted, updatedAt: new Date().toISOString() } : t)); 
      setAllUserTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !isCompleted, updatedAt: new Date().toISOString() } : t));
      toast({ title: "Error Updating Task", variant: "destructive" });
    }
  };

  const handleAddColumnToWorkflow = async (columnName: string) => {
    if (!user || !currentWorkflow) return;
    const originalColumns = JSON.parse(JSON.stringify(currentWorkflow.columns));
    const newColumn: Column = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
      name: columnName.trim(), 
      taskIds: [],
    };
    const updatedColumns = [...currentWorkflow.columns, newColumn];
    setCurrentWorkflow(prev => prev ? { ...prev, columns: updatedColumns, updatedAt: new Date().toISOString() } : null);
    try {
      await updateWorkflowService(currentWorkflow.id, { columns: updatedColumns });
      toast({title: "Column Added"});
    } catch (error) {
      setCurrentWorkflow(prev => prev ? { ...prev, columns: originalColumns } : null); 
      toast({ title: "Error Adding Column", variant: "destructive" });
    }
  };


  const tasksForCalendarFiltered = useMemo(() => {
    return allUserTasks.filter(task => {
      const matchesWorkflow = currentWorkflowId ? task.workflowId === currentWorkflowId : true;
      const matchesBillable = showBillableOnlyCalendar ? task.isBillable : true;
      return matchesWorkflow && matchesBillable && !task.isArchived && task.dueDate;
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


  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    initialMouseXRef.current = e.clientX;
    initialSidebarWidthRef.current = sidebarWidth;
    document.body.classList.add('resizing-sidebar');
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseUp = useCallback(() => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    document.body.classList.remove('resizing-sidebar');
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  }, []);


  const handleResizeMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const dx = e.clientX - initialMouseXRef.current;
    let newWidth = initialSidebarWidthRef.current + dx;
    
    if (newWidth <= MIN_SIDEBAR_WIDTH + 20 && isCalendarSidebarVisible) {
      toggleCalendarSidebar();
      setSidebarWidth(DEFAULT_SIDEBAR_WIDTH); 
      handleResizeMouseUp(); 
      return;
    }

    newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
    setSidebarWidth(newWidth);
  }, [isCalendarSidebarVisible, handleResizeMouseUp, toggleCalendarSidebar]);

  useEffect(() => {
    return () => {
      if (isResizingRef.current) {
        handleResizeMouseUp();
      }
    };
  }, [handleResizeMouseUp]);


  if (authLoading || (!user && !authLoading && router.pathname !== '/landing' && router.pathname !== '/auth')) {
    return (
      <div className="flex flex-1 items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isDesktopSidebarExpanded = isDesktop && isCalendarSidebarVisible;
  const isDesktopSidebarMinimized = isDesktop && !isCalendarSidebarVisible;

  let mainContentMarginLeft = '0px'; 

  if(isDesktop) {
    if (isDesktopSidebarExpanded) {
      mainContentMarginLeft = `${SIDEBAR_MARGIN_LEFT_PX + sidebarWidth + RESIZE_HANDLE_WIDTH}px`;
    } else if (isDesktopSidebarMinimized) {
      mainContentMarginLeft = `${SIDEBAR_MARGIN_LEFT_PX + MINIMIZED_DESKTOP_SIDEBAR_WIDTH_PX + RESIZE_HANDLE_WIDTH}px`;
    }
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
        
        <main className="flex-1 flex overflow-hidden bg-background min-h-0 px-0 md:px-4 md:pb-4 mt-4 md:mt-0">
          {user && isDesktop && (
            <>
            <CalendarSidebar
              className={cn(
                "transition-opacity duration-300 ease-in-out transform shadow-lg rounded-lg",
                "bg-sidebar-background border-r border-sidebar-border",
                "fixed", 
                isDesktopSidebarExpanded && `opacity-100 translate-x-0 ml-4`,
                isDesktopSidebarMinimized && `w-16 opacity-100 translate-x-0 ml-4`
              )}
              style={isDesktopSidebarExpanded ? { width: `${sidebarWidth}px`, top: HEADER_HEIGHT_PLUS_MARGIN_REM, height: VIEWPORT_HEIGHT_MINUS_HEADER_AND_MARGINS } : { top: HEADER_HEIGHT_PLUS_MARGIN_REM, height: VIEWPORT_HEIGHT_MINUS_HEADER_AND_MARGINS }}
              selectedDate={selectedDateForCalendar}
              onSelectDate={setSelectedDateForCalendar}
              tasksByDate={tasksByDateForCalendar}
              onTaskClick={handleTaskClickFromKanbanOrCalendar}
              showBillableOnly={showBillableOnlyCalendar}
              onToggleBillable={setShowBillableOnlyCalendar}
              isMinimizedOnDesktop={isDesktopSidebarMinimized}
              onExpandCalendar={toggleCalendarSidebar}
              isMobileView={!isDesktop}
            />
            {isDesktop && (
              <div
                className="resize-handle hidden md:block"
                style={{
                  left: `${SIDEBAR_MARGIN_LEFT_PX + (isDesktopSidebarExpanded ? sidebarWidth : MINIMIZED_DESKTOP_SIDEBAR_WIDTH_PX)}px`,
                  top: HEADER_HEIGHT_PLUS_MARGIN_REM,  
                  height: VIEWPORT_HEIGHT_MINUS_HEADER_AND_MARGINS, 
                  width: `${RESIZE_HANDLE_WIDTH}px`,
                }}
                onMouseDown={isDesktopSidebarExpanded ? handleResizeMouseDown : undefined}
                onClick={isDesktopSidebarMinimized ? toggleCalendarSidebar : undefined}
              />
            )}
            </>
          )}
          {user && !isDesktop && isCalendarSidebarVisible && (
             <CalendarSidebar
                className={cn(
                    "transition-opacity duration-300 ease-in-out transform shadow-xl md:shadow-lg md:rounded-lg",
                    "bg-sidebar-background border-r border-sidebar-border",
                    "fixed z-30",
                    "top-16 left-0 w-full sm:w-4/5 h-[calc(100vh-4rem-4rem)] opacity-100 translate-x-0" 
                )}
                style={{}} 
                selectedDate={selectedDateForCalendar}
                onSelectDate={setSelectedDateForCalendar}
                tasksByDate={tasksByDateForCalendar}
                onTaskClick={handleTaskClickFromKanbanOrCalendar}
                showBillableOnly={showBillableOnlyCalendar}
                onToggleBillable={setShowBillableOnlyCalendar}
                isMinimizedOnDesktop={false}
                onExpandCalendar={toggleCalendarSidebar}
                isMobileView={!isDesktop}
            />
          )}

           <Card className={cn(
            "flex-1 flex flex-col overflow-hidden min-h-0 transition-all duration-300 ease-in-out",
            "md:rounded-xl md:shadow-lg", 
            "border-0 md:border md:mt-4 md:mb-4"  // Added md:mt-4
           )}
            style={{ 
              marginLeft: isDesktop ? mainContentMarginLeft : '0px',
              marginRight: isDesktop ? '1rem' : '0px',
            }}
           >
            {(isLoadingWorkflows || isLoadingCurrentWorkflow) && user && !currentWorkflow ? (
                <div className="flex flex-1 items-center justify-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : currentWorkflow && user ? (
              <KanbanBoardView
                workflow={currentWorkflow}
                allTasksForWorkflow={tasksForCurrentWorkflow}
                creatorProfiles={creatorProfiles}
                isLoading={isLoadingCurrentWorkflow}
                onTaskClick={handleTaskClickFromKanbanOrCalendar}
                onAddTask={handleAddTaskToWorkflow}
                onTaskDrop={handleMoveTaskInWorkflow}
                onUpdateColumnName={handleUpdateWorkflowColumnName}
                onToggleTaskCompleted={handleToggleWorkflowTaskCompleted}
                onAddColumn={handleAddColumnToWorkflow}
                onWorkflowSettingsUpdate={handleWorkflowSettingsUpdate}
              />
            ) : user ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <LayoutGrid className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-semibold mb-2">No Workflows Yet</h2>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Create your first workflow using the menu above to get started.
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
                isCalendarVisible={isCalendarSidebarVisible && !isDesktop}
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
    

    









