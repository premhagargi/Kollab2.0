
// src/components/modals/TaskDetailsModal.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, User, MessageSquare, Paperclip, Brain, ListChecks, Sparkles, Trash2, Edit3, PlusCircle, Archive, Loader2, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isEqual } from 'date-fns';
import type { Task, Subtask, Comment, TaskPriority, AISummary, AISubtaskSuggestion } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { summarizeTaskAction, suggestSubtasksAction } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => Promise<void>; // Returns promise to indicate save completion
  onArchiveTask: (taskToArchive: Task) => Promise<void>;
}

const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskDetailsModal({ task: initialTaskProp, isOpen, onClose, onUpdateTask, onArchiveTask }: TaskDetailsModalProps) {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(initialTaskProp);
  const initialTaskStateOnOpenRef = useRef<Task | null>(null); // For "Cancel" functionality
  const [isSaving, setIsSaving] = useState(false); // For "Save Changes" button loading state

  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiSubtaskSuggestions, setAiSubtaskSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && initialTaskProp) {
      const deepClonedTask = JSON.parse(JSON.stringify(initialTaskProp)) as Task;
      setTask(deepClonedTask);
      initialTaskStateOnOpenRef.current = deepClonedTask; // Store initial state for cancel
    } else if (!isOpen) {
      setTask(null); // Clear local task state when modal is not open
      initialTaskStateOnOpenRef.current = null;
      // Reset AI features if modal is closed
      setAiSummary(null);
      setAiSubtaskSuggestions([]);
      setIsSaving(false);
    }
  }, [initialTaskProp, isOpen]);

  if (!task && isOpen) { // Should ideally not happen if useEffect handles it
    onClose();
    return null;
  }
  if (!task) return null; // If task becomes null for any reason (e.g. prop changes to null)

  const handleInputChange = (field: keyof Task, value: any) => {
    setTask(prev => prev ? { ...prev, [field]: value, updatedAt: new Date().toISOString() } : null);
  };

  const handleSubtaskChange = (subtaskId: string, completed: boolean) => {
    setTask(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subtasks: prev.subtasks.map(st => st.id === subtaskId ? { ...st, completed } : st),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAddSubtask = (text: string, fromSuggestion = false) => {
    if (!text.trim()) return;
    const subtaskToAdd: Subtask = {
      id: `subtask-${Date.now()}`,
      text: text.trim(),
      completed: false,
    };
    setTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, subtaskToAdd], updatedAt: new Date().toISOString() } : null);
    if (fromSuggestion) {
      setAiSubtaskSuggestions(prev => prev.filter(s => s.text !== text));
    } else {
      setNewSubtask('');
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) {
      toast({ title: "Cannot Add Comment", description: "Comment text is empty or you are not logged in.", variant: "destructive" })
      return;
    }
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId: user.id,
      userName: user.name || 'User',
      userAvatarUrl: user.avatarUrl,
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    setTask(prev => prev ? { ...prev, comments: [...prev.comments, comment], updatedAt: new Date().toISOString() } : null);
    setNewComment('');
  };

  const handleSaveChanges = async () => {
    if (task) {
      setIsSaving(true);
      try {
        await onUpdateTask(task);
        toast({ title: "Task Saved", description: "Your changes have been saved." });
        onClose(); 
      } catch (error) {
        // Error toast is likely handled by onUpdateTask caller or here if specific
        toast({ title: "Save Error", description: "Could not save task changes.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    if (initialTaskStateOnOpenRef.current) {
      setTask(JSON.parse(JSON.stringify(initialTaskStateOnOpenRef.current))); // Revert to state when modal opened
    }
    onClose();
  };

  const handleDialogCloseAttempt = (openState: boolean) => {
    if (!openState) { // If dialog is attempting to close (e.g. X button, Esc)
        // Revert unsaved changes if any (similar to cancel)
        if (initialTaskStateOnOpenRef.current && task && !isEqual(task, initialTaskStateOnOpenRef.current)) {
            // Check if this is a new task that was never really modified from default
            // This logic is now primarily handled by KanbanBoardView.tsx for new tasks
        }
      onClose();
    }
  };

  const handleGenerateSummary = async () => {
    if (!task.description && !task.title) {
      toast({ title: "Cannot Summarize", description: "Task title and description are empty.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const result = await summarizeTaskAction({ taskText: task.title + (task.description ? `\n${task.description}` : '') });
      if (result.summary.startsWith('Error:')) {
        toast({ title: "Summarization Failed", description: result.summary, variant: "destructive" });
        setAiSummary(null);
      } else {
        setAiSummary(result);
        toast({ title: "Summary Generated", description: "AI has summarized the task." });
      }
    } catch (error) {
      toast({ title: "Summarization Failed", description: (error as Error).message, variant: "destructive" });
      setAiSummary(null);
    }
    setIsSummarizing(false);
  };

  const handleSuggestSubtasks = async () => {
    if (!task.description && !task.title) {
      toast({ title: "Cannot Suggest Subtasks", description: "Task title and description are empty.", variant: "destructive" });
      return;
    }
    setIsSuggestingSubtasks(true);
    setAiSubtaskSuggestions([]);
    try {
      const result = await suggestSubtasksAction({ taskDescription: task.title + (task.description ? `\n${task.description}` : '') });
      if (result.subtaskSuggestions.length > 0 && result.subtaskSuggestions[0].startsWith('Error:')) {
        toast({ title: "Subtask Suggestion Failed", description: result.subtaskSuggestions[0], variant: "destructive" });
        setAiSubtaskSuggestions([]);
      } else {
        setAiSubtaskSuggestions(result.subtaskSuggestions.map((s, i) => ({ id: `sugg-${i}`, text: s })));
        toast({ title: "Subtasks Suggested", description: "AI has suggested subtasks." });
      }
    } catch (error) {
      toast({ title: "Subtask Suggestion Failed", description: (error as Error).message, variant: "destructive" });
      setAiSubtaskSuggestions([]);
    }
    setIsSuggestingSubtasks(false);
  };

  const assignee = user; // Placeholder, real assignee logic to be implemented

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogCloseAttempt}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-xl">
        <DialogHeader className="flex-shrink-0 px-2 pt-2 pb-2 border-b">
          <DialogTitle>
            <Input
              id="title"
              value={task.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="text-2xl font-semibold border-0 shadow-none p-1 h-auto w-full placeholder:text-gray-400"
              disabled={isSaving}
              placeholder="Task Title"
            />
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            Last updated: {format(parseISO(task.updatedAt), 'MMM d, yyyy p')}
          </DialogDescription>
        </DialogHeader>
  
        <div className="flex-grow min-h-0 overflow-y-auto px-6">
          <ScrollArea className="h-full">
            <div className="grid gap-6 py-6">
              {/* Description Section */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-medium flex items-center text-gray-700">
                  <Edit3 className="mr-2 h-5 w-5 text-blue-600" /> Description
                </Label>
                <Textarea
                  id="description"
                  value={task.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Add a more detailed description..."
                  className="min-h-[100px] border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  disabled={isSaving}
                />
                {/* AI Buttons as Text Links */}
                <div className="flex space-x-4 mt-2">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing || (!task.description && !task.title) || isSaving}
                    className={`text-sm flex items-center text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors ${isSummarizing ? 'animate-pulse' : ''}`}
                  >
                    <Sparkles className="mr-1 h-4 w-4" /> {isSummarizing ? 'Summarizing...' : 'Generate Summary'}
                  </button>
                  <button
                    onClick={handleSuggestSubtasks}
                    disabled={isSuggestingSubtasks || (!task.description && !task.title) || isSaving}
                    className={`text-sm flex items-center text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors ${isSuggestingSubtasks ? 'animate-pulse' : ''}`}
                  >
                    <ListChecks className="mr-1 h-4 w-4" /> {isSuggestingSubtasks ? 'Suggesting...' : 'Suggest Subtasks'}
                  </button>
                </div>
                {/* AI Outputs */}
                {aiSummary && (
                  <div className="mt-3 p-3 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-blue-600">AI Summary:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{aiSummary.summary}</p>
                  </div>
                )}
                {aiSubtaskSuggestions.length > 0 && (
                  <div className="mt-3 p-3 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-blue-600">AI Subtask Suggestions:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {aiSubtaskSuggestions.map((suggestion) => (
                        <li key={suggestion.id} className="text-sm text-gray-600 flex justify-between items-center">
                          <span>{suggestion.text}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddSubtask(suggestion.text, true)}
                            title="Add this subtask"
                            disabled={isSaving}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
  
              {/* Metadata Section (Due Date, Priority, Assignees) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="flex items-center text-gray-700">
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" /> Due Date
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        id="dueDate" 
                        variant="outline" 
                        className="w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50" 
                        disabled={isSaving}
                      >
                        {task.dueDate ? format(parseISO(task.dueDate), 'PPP') : <span className="text-gray-500">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                        onSelect={(date) => handleInputChange('dueDate', date ? date.toISOString() : null)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="flex items-center text-gray-700">
                    <Sparkles className="mr-2 h-4 w-4 text-blue-600" /> Priority
                  </Label>
                  <select
                    id="priority"
                    value={task.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSaving}
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p} className="capitalize">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignees" className="flex items-center text-gray-700">
                    <User className="mr-2 h-4 w-4 text-blue-600" /> Assignees
                  </Label>
                  <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md min-h-[40px] bg-white">
                    {assignee && task.assigneeIds?.includes(assignee.id) ? (
                      <Avatar className="h-7 w-7" title={assignee.name || undefined}>
                        <AvatarImage src={assignee.avatarUrl || undefined} alt={assignee.name || 'User'} />
                        <AvatarFallback>{assignee.name ? assignee.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-sm text-gray-500">No assignees</span>
                    )}
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 ml-auto border-gray-300 hover:bg-gray-50" 
                      onClick={() => toast({ title: "Feature Coming Soon", description: "Assignee selection will be implemented." })} 
                      disabled={isSaving}
                      aria-label="Add assignee"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
  
              {/* Subtasks Section */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center text-gray-700">
                  <ListChecks className="mr-2 h-5 w-5 text-blue-600" /> Subtasks
                </Label>
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center space-x-2 p-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Checkbox
                      id={`subtask-${subtask.id}`}
                      checked={subtask.completed}
                      onCheckedChange={(checked) => handleSubtaskChange(subtask.id, !!checked)}
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={`subtask-${subtask.id}`}
                      className={`flex-grow text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                    >
                      {subtask.text}
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-gray-500 hover:text-red-600" 
                      onClick={() => toast({ title: "Subtask Deletion", description: "To be implemented" })} 
                      disabled={isSaving}
                      aria-label={`Delete subtask ${subtask.text}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2 pt-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add new subtask..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(newSubtask)}
                    disabled={isSaving}
                    className="border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button 
                    onClick={() => handleAddSubtask(newSubtask)} 
                    size="sm" 
                    disabled={!newSubtask.trim() || isSaving}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
  
              {/* Attachments Section */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center text-gray-700">
                  <Paperclip className="mr-2 h-5 w-5 text-blue-600" /> Attachments
                </Label>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-300 hover:bg-gray-50" 
                  onClick={() => toast({ title: "Feature Coming Soon", description: "File attachments will be implemented." })} 
                  disabled={isSaving}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Attachment
                </Button>
              </div>
  
              <Separator className="my-4" />
  
              {/* Comments Section */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center text-gray-700">
                  <MessageSquare className="mr-2 h-5 w-5 text-blue-600" /> Comments
                </Label>
                <ScrollArea className="max-h-48 border border-gray-300 rounded-lg p-3">
                  {task.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-3 py-2 border-b last:border-b-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.userAvatarUrl || undefined} alt={comment.userName} />
                        <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">{comment.userName}</p>
                          <p className="text-xs text-gray-500">{format(parseISO(comment.createdAt), 'MMM d, p')}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {task.comments.length === 0 && <p className="text-sm text-gray-500 p-2">No comments yet.</p>}
                </ScrollArea>
                {user && (
                  <>
                    <div className="flex items-start space-x-3 pt-3">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} />
                        <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-grow border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-20"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="text-right mt-2">
                      <Button 
                        onClick={handleAddComment} 
                        size="sm" 
                        disabled={!newComment.trim() || isSaving}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Post Comment
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
  
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0 bg-gray-50">
          <Button
            variant="outline"
            onClick={() => {
              if (task && !isSaving) {
                onArchiveTask(task);
              }
            }}
            className="mr-auto border-gray-300 hover:bg-gray-100 text-gray-700"
            disabled={isSaving || task.isArchived}
          >
            <Archive className="mr-2 h-4 w-4" /> {task.isArchived ? 'Archived' : 'Archive Task'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleCancel} 
            disabled={isSaving}
            className="border-gray-300 hover:bg-gray-100 text-gray-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
