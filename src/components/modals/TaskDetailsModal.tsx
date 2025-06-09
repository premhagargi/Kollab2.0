// src/components/modals/TaskDetailsModal.tsx
"use client";
import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, User, MessageSquare, Paperclip, Brain, ListChecks, Sparkles, Trash2, Edit3, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import type { Task, Subtask, Comment, TaskPriority, AISummary, AISubtaskSuggestion } from '@/types';
import { mockUser } from '@/lib/mock-data';
import { summarizeTaskAction, suggestSubtasksAction } from '@/actions/ai';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void; // Placeholder for actual update
}

const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskDetailsModal({ task: initialTask, isOpen, onClose, onUpdateTask }: TaskDetailsModalProps) {
  const [task, setTask] = useState<Task | null>(initialTask);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiSubtaskSuggestions, setAiSubtaskSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    setTask(initialTask);
    setAiSummary(null); // Reset AI states when task changes
    setAiSubtaskSuggestions([]);
  }, [initialTask]);

  if (!task) return null;

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
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId: mockUser.id,
      userName: mockUser.name || 'User',
      userAvatarUrl: mockUser.avatarUrl,
      text: newComment.trim(),
      createdAt: new Date().toISOString(),
    };
    setTask(prev => prev ? { ...prev, comments: [...prev.comments, comment], updatedAt: new Date().toISOString() } : null);
    setNewComment('');
  };
  
  const handleSaveChanges = () => {
    if (task) {
      onUpdateTask(task); // In a real app, this would call an API
      toast({ title: "Task Updated", description: `"${task.title}" has been saved.` });
    }
    onClose();
  };

  const handleGenerateSummary = async () => {
    if (!task.description) {
      toast({ title: "Cannot Summarize", description: "Task description is empty.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    setAiSummary(null);
    try {
      const result = await summarizeTaskAction({ taskDescription: task.description });
      setAiSummary(result);
      toast({ title: "Summary Generated", description: "AI has summarized the task." });
    } catch (error) {
      toast({ title: "Summarization Failed", description: (error as Error).message, variant: "destructive" });
    }
    setIsSummarizing(false);
  };

  const handleSuggestSubtasks = async () => {
    if (!task.description) {
      toast({ title: "Cannot Suggest Subtasks", description: "Task description is empty.", variant: "destructive" });
      return;
    }
    setIsSuggestingSubtasks(true);
    setAiSubtaskSuggestions([]);
    try {
      const result = await suggestSubtasksAction({ taskDescription: task.description });
      setAiSubtaskSuggestions(result.subtaskSuggestions.map((s,i) => ({ id: `sugg-${i}`, text:s })));
      toast({ title: "Subtasks Suggested", description: "AI has suggested subtasks." });
    } catch (error) {
      toast({ title: "Subtask Suggestion Failed", description: (error as Error).message, variant: "destructive" });
    }
    setIsSuggestingSubtasks(false);
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">{task.title}</DialogTitle>
          <DialogDescription>
            Last updated: {format(parseISO(task.updatedAt), 'MMM d, yyyy p')}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="grid gap-6 py-4">
            {/* Description Section */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-medium flex items-center"><Edit3 className="mr-2 h-5 w-5 text-primary" /> Description</Label>
              <Textarea
                id="description"
                value={task.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Add a more detailed description..."
                className="min-h-[100px]"
              />
            </div>

            {/* AI Features Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-secondary/30">
              <h3 className="text-sm font-semibold flex items-center text-primary"><Brain className="mr-2 h-5 w-5" /> AI Assistant</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={handleGenerateSummary} disabled={isSummarizing || !task.description} variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" /> {isSummarizing ? 'Summarizing...' : 'Generate Summary'}
                </Button>
                <Button onClick={handleSuggestSubtasks} disabled={isSuggestingSubtasks || !task.description} variant="outline">
                  <ListChecks className="mr-2 h-4 w-4" /> {isSuggestingSubtasks ? 'Suggesting...' : 'Suggest Subtasks'}
                </Button>
              </div>
              {aiSummary && (
                <div className="mt-2 p-3 border rounded-md bg-background">
                  <p className="text-sm font-medium text-primary">AI Summary:</p>
                  <p className="text-sm text-muted-foreground">{aiSummary.summary}</p>
                </div>
              )}
              {aiSubtaskSuggestions.length > 0 && (
                <div className="mt-2 p-3 border rounded-md bg-background">
                  <p className="text-sm font-medium text-primary">AI Subtask Suggestions:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    {aiSubtaskSuggestions.map((suggestion) => (
                      <li key={suggestion.id} className="text-sm text-muted-foreground flex justify-between items-center">
                        <span>{suggestion.text}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleAddSubtask(suggestion.text, true)} title="Add this subtask">
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Details: Due Date, Priority, Assignees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-primary" /> Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDate"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {task.dueDate ? format(parseISO(task.dueDate), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                      onSelect={(date) => handleInputChange('dueDate', date ? date.toISOString() : undefined)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="flex items-center"><Sparkles className="mr-2 h-4 w-4 text-primary"/> Priority</Label>
                <select
                  id="priority"
                  value={task.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as TaskPriority)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {priorityOptions.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignees" className="flex items-center"><User className="mr-2 h-4 w-4 text-primary"/> Assignees</Label>
                {/* Assignee selection would be more complex; using a placeholder */}
                <div className="flex items-center space-x-2 p-2 border rounded-md min-h-[40px]">
                  {task.assigneeIds && task.assigneeIds.includes(mockUser.id) ? (
                     <Avatar className="h-7 w-7" title={mockUser.name || undefined}>
                        <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name || 'User'} data-ai-hint="user avatar small"/>
                        <AvatarFallback>{mockUser.name ? mockUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                      </Avatar>
                  ) : <span className="text-sm text-muted-foreground">No assignees</span>}
                  <Button variant="outline" size="icon" className="h-7 w-7 ml-auto"><PlusCircle className="h-4 w-4"/></Button>
                </div>
              </div>
            </div>

            {/* Subtasks Section */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/> Subtasks</Label>
              {task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                  <Checkbox
                    id={`subtask-${subtask.id}`}
                    checked={subtask.completed}
                    onCheckedChange={(checked) => handleSubtaskChange(subtask.id, !!checked)}
                  />
                  <Label htmlFor={`subtask-${subtask.id}`} className={`flex-grow ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {subtask.text}
                  </Label>
                   <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100">
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
                />
                <Button onClick={() => handleAddSubtask(newSubtask)} size="sm" disabled={!newSubtask.trim()}>
                  <PlusCircle className="mr-1 h-4 w-4"/> Add
                </Button>
              </div>
            </div>
            
            {/* Attachments Section (Placeholder) */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center"><Paperclip className="mr-2 h-5 w-5 text-primary"/> Attachments</Label>
              <Button variant="outline" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4"/> Add Attachment
              </Button>
              {/* List attachments here */}
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-2">
              <Label className="text-base font-medium flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary"/> Comments</Label>
              {task.comments.map(comment => (
                <div key={comment.id} className="flex items-start space-x-3 p-3 border rounded-md">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.userAvatarUrl || undefined} alt={comment.userName} data-ai-hint="user avatar small" />
                    <AvatarFallback>{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{comment.userName}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(comment.createdAt), 'MMM d, p')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start space-x-3 pt-2">
                 <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name || 'User'} data-ai-hint="user avatar small" />
                    <AvatarFallback>{mockUser.name ? mockUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                  </Avatar>
                <Textarea 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Write a comment..." 
                  className="flex-grow"
                />
              </div>
              <div className="text-right mt-2">
                <Button onClick={handleAddComment} size="sm" disabled={!newComment.trim()}>Post Comment</Button>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveChanges}><CheckCircle2 className="mr-2 h-4 w-4"/> Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
