
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
    if (provisionalNewTaskIdRef.current && selectedTask && selectedTask.id === provisionalNewTaskIdRef.current) {
        const taskInBoardTasks = boardTasks.find(t => t.id === selectedTask.id);
        if (taskInBoardTasks && taskInBoardTasks.title === DEFAULT_NEW_TASK_TITLE && (!taskInBoardTasks.description || taskInBoardTasks.description.trim() === '')) {
            deleteProvisionalTask(selectedTask.id);
        }
    }
    provisionalNewTaskIdRef.current = null; 
    setIsModalOpen(false);
    setSelectedTask(null);
  };


  const handleUpdateTask = async (updatedTask: Task) => {
    if (!user || !currentBoard) return;
    try {
      await updateTaskService(updatedTask.id, updatedTask);
      setBoardTasks(prevTasks => prevTasks.map(t => t.id === updatedTask.id ? updatedTask : t));
      
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
      
      handleTaskClick(createdTask); 

      // Update board in background, don't await before opening modal
      updateBoard(currentBoard.id, { columns: updatedBoardColumns })
         .catch(err => {
            console.error("Error updating board in background after task creation:", err);
            toast({title: "Board Update Error", description: "Could not save new task to board structure in background.", variant: "destructive"});
            // Optionally re-fetch or revert here if critical
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
      return;
    }

    const newColumn: ColumnType = {
      id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    let newBoardColumns = JSON.parse(JSON.stringify(currentBoard.columns)) as ColumnType[];
    const sourceColIndex = newBoardColumns.findIndex(col => col.id === sourceColumnId);
    const destColIndex = newBoardColumns.findIndex(col => col.id === destinationColumnId);

    if (sourceColIndex === -1 || destColIndex === -1) {
        console.error("Source or destination column not found during drag and drop.");
        if (currentBoard) fetchBoardData(currentBoard.id);
        return;
    }

    if (sourceColumnId !== destinationColumnId) {
        setBoardTasks(prevTasks =>
            prevTasks.map(t => (t.id === taskId ? { ...t, columnId: destinationColumnId } : t))
        );
    }

    newBoardColumns[sourceColIndex].taskIds = newBoardColumns[sourceColIndex].taskIds.filter(id => id !== taskId);

    let destTaskIds = [...newBoardColumns[destColIndex].taskIds];
    const currentTaskIndexInDest = destTaskIds.indexOf(taskId); 
    if (currentTaskIndexInDest > -1) {
        destTaskIds.splice(currentTaskIndexInDest, 1); 
    }

    const targetIndexInDest = targetTaskId ? destTaskIds.indexOf(targetTaskId) : -1;

    if (sourceColumnId === destinationColumnId) { 
        if (targetIndexInDest !== -1) {
            destTaskIds.splice(targetIndexInDest, 0, taskId);
        } else {
            destTaskIds.push(taskId); 
        }
    } else { 
        if (targetIndexInDest !== -1) {
            destTaskIds.splice(targetIndexInDest, 0, taskId);
        } else {
            destTaskIds.push(taskId);
        }
    }
    newBoardColumns[destColIndex].taskIds = destTaskIds;

    setCurrentBoard(prevBoard => (prevBoard ? { ...prevBoard, columns: newBoardColumns } : null));

    try {
        if (sourceColumnId !== destinationColumnId) {
            await updateTaskService(taskId, { columnId: destinationColumnId });
        }
        await updateBoard(currentBoard.id, { columns: newBoardColumns });
    } catch (error) {
        console.error("Error moving task:", error);
        toast({ title: "Error Moving Task", description: "Could not update task position. Re-fetching board.", variant: "destructive" });
        if (currentBoard) fetchBoardData(currentBoard.id); 
    }
};

  const handleArchiveTask = async (taskToArchive: Task) => {
    if (!user || !currentBoard) return;

    const originalBoardTasks = [...boardTasks];
    const originalBoardState = currentBoard ? JSON.parse(JSON.stringify(currentBoard)) : null;

    setBoardTasks(prevTasks => prevTasks.filter(t => t.id !== taskToArchive.id));
    const updatedColumns = currentBoard.columns.map(col => {
      if (col.taskIds.includes(taskToArchive.id)) {
        return { ...col, taskIds: col.taskIds.filter(tid => tid !== taskToArchive.id) };
      }
      return col;
    });
    setCurrentBoard(prevBoard => prevBoard ? { ...prevBoard, columns: updatedColumns } : null);
    
    const previouslySelectedTask = selectedTask;
    if (isModalOpen && previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
        setIsModalOpen(false); 
        setSelectedTask(null); 
    }

    try {
      await updateTaskService(taskToArchive.id, { isArchived: true, archivedAt: new Date().toISOString() });
      await updateBoard(currentBoard.id, { columns: updatedColumns }); 
      toast({ title: "Task Archived", description: `"${taskToArchive.title}" has been archived.` });
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({ title: "Error Archiving Task", description: "Could not archive task. Reverting.", variant: "destructive" });
      setBoardTasks(originalBoardTasks);
      if (originalBoardState) setCurrentBoard(originalBoardState);
       if (previouslySelectedTask && previouslySelectedTask.id === taskToArchive.id) {
         setSelectedTask(previouslySelectedTask); 
         setIsModalOpen(true);
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
    // This case is handled by page.tsx (no boards message or login message)
    return null;
  }

  return (
    // This root div takes h-full from its parent in page.tsx (which is <main>)
    <div className="flex flex-col h-full overflow-hidden bg-background text-foreground">
      {/* Sticky Board Header: Stays at the top of KanbanBoardView */}
      {/* flex-shrink-0 prevents this header from shrinking if content is too large */}
      <div className={`sticky top-0 z-30 flex items-center justify-between p-2 border-b bg-background shadow-sm flex-shrink-0`}>
        <h1 className="text-lg font-medium truncate pr-2">{currentBoard.name}</h1>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button 
            size="sm"
            onClick={() => handleAddTask(currentBoard.columns[0]?.id ?? '')}
            disabled={currentBoard.columns.length === 0}
            variant="default" // Changed to default for more prominence
          >
            <Plus className="mr-1 h-3 w-3" /> New Task
          </Button>
        </div>
      </div>
      
      {/* This div takes remaining space (flex-1) and handles horizontal scroll for KanbanBoard */}
      {/* min-h-0 is important for flex children that need to scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <KanbanBoard
          boardColumns={currentBoard.columns}
          allTasksForBoard={activeTasks}
          creatorProfiles={userProfiles}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onAddColumn={handleAddColumn}
          onTaskDrop={handleTaskDrop}
        />
      </div>

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdateTask={handleUpdateTask}
          onArchiveTask={handleArchiveTask}
        />
      )}
    </div>
  );
}
    
