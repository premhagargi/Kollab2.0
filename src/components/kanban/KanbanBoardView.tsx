
// src/components/kanban/KanbanBoardView.tsx
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { TaskDetailsModal } from '../modals/TaskDetailsModal';
import { Button } from '@/components/ui/button';
import type { Board, Task, Column as ColumnType, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Loader2 } from 'lucide-react';
import { getBoardById, updateBoard } from '@/services/boardService';
import { getTasksByBoard, createTask, updateTask as updateTaskService, deleteTask } from '@/services/taskService';
import { getUsersByIds } from '@/services/userService';

const DEFAULT_NEW_TASK_TITLE = 'New Task';

export function KanbanBoardView({ boardId }: { boardId: string | null }) {
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boardTasks, setBoardTasks] = useState<Task[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile | null>>({});
  const provisionalNewTaskIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  const fetchBoardData = useCallback(async (id: string) => {
    if (!user) return;
    setIsLoadingBoard(true);
    setUserProfiles({});
    try {
      const boardData = await getBoardById(id);
      if (boardData && boardData.ownerId === user.id) {
        setCurrentBoard(boardData);
        const tasksData = await getTasksByBoard(id);
        setBoardTasks(tasksData); 

        const allUserIds = new Set<string>();
        tasksData.forEach(task => {
          if (task.creatorId) allUserIds.add(task.creatorId);
          // Potentially add assigneeIds here in the future if needed for profiles
        });
        if (allUserIds.size > 0) {
          const profiles = await getUsersByIds(Array.from(allUserIds));
          const profilesMap: Record<string, UserProfile | null> = {};
          profiles.forEach(p => profilesMap[p.id] = p);
          setUserProfiles(profilesMap);
        }
      } else if (boardData) {
        toast({ title: "Access Denied", description: "You do not have permission to view this board.", variant: "destructive" });
        setCurrentBoard(null); setBoardTasks([]);
      } else {
        toast({ title: "Board Not Found", description: "The requested board does not exist.", variant: "destructive" });
        setCurrentBoard(null); setBoardTasks([]);
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
      toast({ title: "Error", description: "Could not load board data.", variant: "destructive" });
    } finally {
      setIsLoadingBoard(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (boardId) {
      fetchBoardData(boardId);
    } else {
      setCurrentBoard(null);
      setBoardTasks([]);
      setUserProfiles({});
    }
  }, [boardId, fetchBoardData]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };
  
  const deleteProvisionalTask = async (taskIdToDelete: string) => {
    if (!currentBoard || !user) return;
    try {
      await deleteTask(taskIdToDelete);

      const updatedBoardColumns = currentBoard.columns.map(col => ({
        ...col,
        taskIds: col.taskIds.filter(id => id !== taskIdToDelete)
      }));
      
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedBoardColumns } : null);
      // Persist the board change (task ID removal from column)
      if (currentBoard) { 
        await updateBoard(currentBoard.id, { columns: updatedBoardColumns });
      }

      setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskIdToDelete));
      toast({ title: "New Task Discarded", description: "The empty new task was removed." });
    } catch (error) {
      console.error("Error deleting provisional task:", error);
      toast({ title: "Error", description: "Could not remove the provisional task.", variant: "destructive" });
      if (currentBoard) fetchBoardData(currentBoard.id);
    }
  };

  const handleCloseModal = () => {
    // This is called when TaskDetailsModal's onClose is triggered (e.g., Save, Cancel, X, Esc).
    // If provisionalNewTaskIdRef.current is still set, it means the modal for a NEW task
    // was closed WITHOUT that new task being successfully saved via "Save Changes" button.
    if (provisionalNewTaskIdRef.current && selectedTask && selectedTask.id === provisionalNewTaskIdRef.current) {
        const taskInBoardTasks = boardTasks.find(t => t.id === selectedTask.id);
        // Check if it's still in its default state (title "New Task" and no description)
        // This check is important for the "Cancel" case, where local modal changes are reverted.
        if (taskInBoardTasks && taskInBoardTasks.title === DEFAULT_NEW_TASK_TITLE && (!taskInBoardTasks.description || taskInBoardTasks.description.trim() === '')) {
            deleteProvisionalTask(selectedTask.id);
        }
    }
    provisionalNewTaskIdRef.current = null; // Always clear the ref when the modal closes for any reason
    setIsModalOpen(false);
    setSelectedTask(null);
  };


  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      
      // If this was the provisional task and it was successfully saved,
      // it's no longer provisional.
      if (provisionalNewTaskIdRef.current === updatedTask.id) {
        provisionalNewTaskIdRef.current = null; 
      }

      if (updatedTask.creatorId && !userProfiles[updatedTask.creatorId]) {
        const profile = await getUsersByIds([updatedTask.creatorId]);
        if (profile.length > 0) {
          setUserProfiles(prev => ({ ...prev, [updatedTask.creatorId]: profile[0] }));
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
      throw error; 
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add task without a selected board or user.", variant: "destructive" });
      return;
    }
    const targetColumn = currentBoard.columns.find(col => col.id === columnId) || currentBoard.columns[0];

    if (!targetColumn) {
        toast({ title: "Error", description: "Cannot add task: No columns available on the board.", variant: "destructive" });
        return;
    }

    const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: DEFAULT_NEW_TASK_TITLE,
      description: '',
      priority: 'medium',
      subtasks: [],
      comments: [],
      boardId: currentBoard.id,
      columnId: targetColumn.id,
      creatorId: user.id,
      isArchived: false,
    };

    try {
      const createdTask = await createTask(newTaskData);
      provisionalNewTaskIdRef.current = createdTask.id; 

      setBoardTasks(prevTasks => [...prevTasks, createdTask]);

      const updatedBoardColumns = currentBoard.columns.map(col => {
        if (col.id === targetColumn.id) {
          return { ...col, taskIds: [...col.taskIds, createdTask.id] };
        }
        return col;
      });
      
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedBoardColumns } : null);
      handleTaskClick(createdTask); // Open modal immediately after local state update

      // Update board in Firestore in the background
      updateBoard(currentBoard.id, { columns: updatedBoardColumns })
        .catch(boardUpdateError => {
            console.error("Error updating board in background with new task ID:", boardUpdateError);
            toast({ title: "Board Sync Error", description: "Failed to save new task to board structure fully. Please refresh if issues persist.", variant: "destructive" });
            if (currentBoard) {
                fetchBoardData(currentBoard.id); // Attempt to re-sync
            }
        });


      if (createdTask.creatorId && !userProfiles[createdTask.creatorId]) {
        getUsersByIds([createdTask.creatorId]).then(profile => {
          if (profile.length > 0) {
            setUserProfiles(prev => ({ ...prev, [createdTask.creatorId]: profile[0] }));
          }
        }).catch(profileError => console.error("Error fetching creator profile for new task:", profileError));
      }

    } catch (error) {
      console.error("Error creating task:", error); 
      toast({ title: "Error Creating Task", description: "Failed to create new task.", variant: "destructive" });
    }
  };

  const handleAddColumn = async () => {
    if (!user || !currentBoard) {
      toast({ title: "Error", description: "Cannot add column without a selected board or user.", variant: "destructive" });
      return;
    }
    const columnName = prompt("Enter new column name:");
    if (!columnName || !columnName.trim()) {
      // toast({ title: "Cancelled", description: "Column creation cancelled or name empty.", variant: "default" });
      return;
    }

    const newColumn: ColumnType = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // More unique ID
      name: columnName.trim(),
      taskIds: [],
    };

    const updatedColumns = [...currentBoard.columns, newColumn];
    try {
      await updateBoard(currentBoard.id, { columns: updatedColumns });
      setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
      toast({ title: "Column Added", description: `Column "${newColumn.name}" added.` });
    } catch (error) {
      console.error("Error adding column:", error);
      toast({ title: "Error Adding Column", description: "Failed to add column.", variant: "destructive" });
    }
  };

  const handleTaskDrop = async (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => {
    if (!currentBoard || !user) return;
  
    const taskToMove = boardTasks.find(t => t.id === taskId);
    if (!taskToMove) return;
  
    // Deep copy of columns to manipulate
    let newBoardColumns = JSON.parse(JSON.stringify(currentBoard.columns)) as ColumnType[];
    const sourceColIndex = newBoardColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newBoardColumns.findIndex(col => col.id === destinationColumnId);
  
    if (sourceColIndex === -1 || destColIndex === -1) {
      console.error("Source or destination column not found during drag and drop.");
      if (currentBoard) fetchBoardData(currentBoard.id); 
      return;
    }
  
    // Optimistically update task's columnId if moving between columns
    if (sourceColumnId !== destinationColumnId) {
      setBoardTasks(prevTasks =>
        prevTasks.map(t => (t.id === taskId ? { ...t, columnId: destinationColumnId } : t))
      );
    }
  
    // Remove task from source column's taskIds
    newBoardColumns[sourceColIndex].taskIds = newBoardColumns[sourceColIndex].taskIds.filter(id => id !== taskId);
  
    // Add task to destination column's taskIds in the correct position
    let destTaskIds = [...newBoardColumns[destColIndex].taskIds];
    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;
  
    if (targetIndexInDest !== -1) {
      destTaskIds.splice(targetIndexInDest, 0, taskId); // Insert before target task
    } else {
      destTaskIds.push(taskId); // Append to the end if no target or target not found
    }
    newBoardColumns[destColIndex].taskIds = destTaskIds;
    
    // Optimistically update board state
    setCurrentBoard(prevBoard => (prevBoard ? { ...prevBoard, columns: newBoardColumns } : null));
  
    try {
      // Persist changes to Firestore
      if (sourceColumnId !== destinationColumnId) {
        await updateTaskService(taskId, { columnId: destinationColumnId });
      }
      await updateBoard(currentBoard.id, { columns: newBoardColumns });
      toast({ title: "Task Moved", description: `Task "${taskToMove.title}" position updated.` });
    } catch (error) {
      console.error("Error moving task:", error);
      toast({ title: "Error Moving Task", description: "Could not update task position. Re-fetching board.", variant: "destructive" });
      if (currentBoard) fetchBoardData(currentBoard.id); // Revert optimistic update by re-fetching
    }
  };
  

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user || !currentBoard) return;

    const originalBoardTasks = [...boardTasks];
    const originalBoardState = currentBoard ? JSON.parse(JSON.stringify(currentBoard)) : null;

    // Optimistic UI updates
    setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    const updatedColumns = currentBoard.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
    
    const previouslySelectedTask = selectedTask;
    // Close modal if the archived task was selected
    // Note: handleCloseModal will be called by TaskDetailsModal's onClose
    if (isModalOpen && previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
        setIsModalOpen(false); // This will trigger handleCloseModal via the modal's onOpenChange
        setSelectedTask(null); 
    }


    try {
      // The actual import is now dynamic, but keeping the old style for direct call example
      // For actual dynamic import, it would be: const { archiveTask: archiveTaskInService } = await import('@/services/taskService');
      // Assuming archiveTask is directly exported from taskService now based on previous fixes.
      await updateTaskService(taskToArchive.id, { isArchived: true, archivedAt: new Date().toISOString() });
      await updateBoard(currentBoard.id, { columns: updatedColumns }); 
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({ title: "Error Archiving Task", description: "Could not archive task. Reverting.", variant: "destructive" });
      // Revert optimistic updates
      setBoardTasks(originalBoardTasks);
      if (originalBoardState) setCurrentBoard(originalBoardState);
       if (previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
         setSelectedTask(previouslySelectedTask); // Re-select if modal was closed
         setIsModalOpen(true); // Re-open modal if it was closed
       }
    }
  };

  const activeTasks = boardTasks.filter(task => !task.isArchived);

  if (isLoadingBoard) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (!currentBoard) {
    // This view should ideally not be rendered if there's no currentBoard.
    // The parent page (src/app/page.tsx) handles the "No Boards Yet" or "Login" message.
    return null;
  }

  const headerHeight = '4rem'; // Assuming AppHeader height
  const boardHeaderHeight = '3.5rem'; // KanbanBoardView's own header height

  return (
    <div className="flex flex-col h-full" style={{ ['--header-height' as any]: headerHeight, ['--board-header-height' as any]: boardHeaderHeight }}>
      {/* Board Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-semibold font-headline">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2">
          {/* "New Task" button adds to the first column, or disabled if no columns */}
          <Button 
            size="sm" 
            onClick={() => handleAddTask(currentBoard.columns[0]?.id ?? '')} 
            disabled={currentBoard.columns.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </div>
      </div>
      <KanbanBoard
        boardColumns={currentBoard.columns}
        allTasksForBoard={activeTasks} // Pass only active tasks to the board for display
        creatorProfiles={userProfiles}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask} // Passed for columns to use
        onAddColumn={handleAddColumn}
        onTaskDrop={handleTaskDrop}
      />
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={handleCloseModal} // This is critical for the discard logic
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
        />
      )}
    </div>
  );
}

