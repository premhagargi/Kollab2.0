
"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, User, MessageSquare, Paperclip, Brain, ListChecks, Sparkles, Trash2, Edit3, PlusCircle, Archive, Loader2, Clock, DollarSign, Target } from 'lucide-react'; // Removed Briefcase as clientName is on workflow
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isEqual, set } from 'date-fns';
import type { Task, Subtask, Comment, TaskPriority, AISummary, AISubtaskSuggestion } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { summarizeTaskAction, suggestSubtasksAction } from '@/actions/ai';
import type { TaskSummarizationInput } from '@/ai/flows/task-summarization';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface TaskDetailsModalProps {
  task: Task | null; 
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => Promise<void>;
  onArchiveTask: (taskToArchive: Task) => Promise<void>;
  // clientName prop removed, as it's now part of workflow, not passed to task modal directly
}

const priorityOptions: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function TaskDetailsModal({ task: initialTaskProp, isOpen, onClose, onUpdateTask, onArchiveTask }: TaskDetailsModalProps) {
  const { user } = useAuth();
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const initialTaskStateOnOpenRef = useRef<Task | null>(null);
  
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newDeliverable, setNewDeliverable] = useState('');
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiSubtaskSuggestions, setAiSubtaskSuggestions] = useState<AISubtaskSuggestion[]>([]);
  const [time, setTime] = useState<string>('12:00');
  const { toast } = useToast();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);


  useEffect(() => {
    if (isOpen && initialTaskProp) {
      const deepClonedTask = JSON.parse(JSON.stringify(initialTaskProp)) as Task;
      // clientName is no longer a direct property of Task
      deepClonedTask.isBillable = deepClonedTask.isBillable || false;
      deepClonedTask.deliverables = deepClonedTask.deliverables || [];

      setCurrentTask(deepClonedTask);
      initialTaskStateOnOpenRef.current = JSON.parse(JSON.stringify(deepClonedTask));

      if (initialTaskProp.dueDate) {
        setTime(format(parseISO(initialTaskProp.dueDate), 'HH:mm'));
      } else {
        setTime('12:00');
      }
      setAiSummary(null);
      setAiSubtaskSuggestions([]);
      setNewComment('');
      setNewSubtask('');
      setNewDeliverable('');
    } else if (!isOpen) {
        setCurrentTask(null);
        initialTaskStateOnOpenRef.current = null;
    }
  }, [initialTaskProp, isOpen]);


  const handleDialogCloseAttempt = (openState: boolean) => {
    if (!openState) { 
      if (currentTask && initialTaskStateOnOpenRef.current) {
        const hasChanges = JSON.stringify(currentTask) !== JSON.stringify(initialTaskStateOnOpenRef.current);
        if (hasChanges) {
          onUpdateTask(currentTask).catch(error => {
            console.error("Background save failed from modal context:", error);
            toast({ title: "Save Failed", description: "Changes might not be saved to the server.", variant: "destructive" });
          });
        }
      }
      onClose(); 
    }
  };

  const handleInputChange = (field: keyof Task, value: any) => {
    setCurrentTask(prev => prev ? { ...prev, [field]: value, updatedAt: new Date().toISOString() } : null);
  };

  const handleSubtaskChange = (subtaskId: string, completed: boolean) => {
    setCurrentTask(prev => {
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
    setCurrentTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, subtaskToAdd], updatedAt: new Date().toISOString() } : null);
    if (fromSuggestion) {
      setAiSubtaskSuggestions(prevSugg => prevSugg.filter(s => s.text !== text));
    } else {
      setNewSubtask('');
    }
  };

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim() || !currentTask) return;
    const updatedDeliverables = [...(currentTask.deliverables || []), newDeliverable.trim()];
    handleInputChange('deliverables', updatedDeliverables);
    setNewDeliverable('');
  };

  const handleRemoveDeliverable = (indexToRemove: number) => {
    if (!currentTask || !currentTask.deliverables) return;
    const updatedDeliverables = currentTask.deliverables.filter((_, index) => index !== indexToRemove);
    handleInputChange('deliverables', updatedDeliverables);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !user) {
      toast({ title: "Cannot Post", description: "Please write a comment and ensure you're logged in.", variant: "destructive" });
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
    setCurrentTask(prev => prev ? { ...prev, comments: [...prev.comments, comment], updatedAt: new Date().toISOString() } : null);
    setNewComment('');
  };

  const handleGenerateSummary = async () => {
    if (!currentTask) {
        toast({ title: "Error", description: "No task data available to generate summary.", variant: "destructive" });
        return;
    }
    if (!currentTask.description && !currentTask.title) {
      toast({ title: "Cannot Summarize", description: "Task title and details are empty.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    setAiSummary(null);

    const summarizationInput: TaskSummarizationInput = {
        title: currentTask.title,
        description: currentTask.description || undefined,
        isCompleted: currentTask.isCompleted,
        priority: currentTask.priority,
        dueDate: currentTask.dueDate || undefined,
        subtasks: currentTask.subtasks.map(st => ({ text: st.text, completed: st.completed })),
        // clientName removed from input, as it's not on Task type anymore
        deliverables: currentTask.deliverables || undefined,
    };

    try {
      const result = await summarizeTaskAction(summarizationInput);
      if (result.summary.startsWith('Error:')) {
        toast({ title: "Draft Failed", description: result.summary, variant: "destructive" });
        setAiSummary(null);
      } else {
        setAiSummary(result);
        toast({ title: "Draft Created", description: "Client update draft generated by AI." });
      }
    } catch (error) {
      toast({ title: "Draft Failed", description: (error as Error).message, variant: "destructive" });
      setAiSummary(null);
    }
    setIsSummarizing(false);
  };

  const handleSuggestSubtasks = async () => {
    if (!currentTask || (!currentTask.description && !currentTask.title)) {
      toast({ title: "Cannot Suggest", description: "Task title and details are empty.", variant: "destructive" });
      return;
    }
    setIsSuggestingSubtasks(true);
    setAiSubtaskSuggestions([]);
    try {
      const result = await suggestSubtasksAction({ taskDescription: currentTask.title + (currentTask.description ? `\n${currentTask.description}` : '') });
      if (result.subtaskSuggestions.length > 0 && result.subtaskSuggestions[0].startsWith('Error:')) {
        toast({ title: "Suggestion Failed", description: result.subtaskSuggestions[0], variant: "destructive" });
        setAiSubtaskSuggestions([]);
      } else {
        setAiSubtaskSuggestions(result.subtaskSuggestions.map((s, i) => ({ id: `sugg-${i}`, text: s })));
        toast({ title: "Steps Suggested", description: "AI-generated next steps ready to add." });
      }
    } catch (error) {
      toast({ title: "Suggestion Failed", description: (error as Error).message, variant: "destructive" });
      setAiSubtaskSuggestions([]);
    }
    setIsSuggestingSubtasks(false);
  };

  const handleDateTimeSelect = (date?: Date) => {
    if (!date || !currentTask) {
      handleInputChange('dueDate', null);
      return;
    }
    const [hours, minutes] = time.split(':').map(Number);
    const updatedDate = set(date, { hours, minutes });
    handleInputChange('dueDate', updatedDate.toISOString());
  };

  const assignee = user;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogCloseAttempt}>
      {currentTask && ( 
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-gradient-to-br from-background to-background/95 rounded-xl shadow-2xl border border-border/50">
          <DialogHeader className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-border/50">
            <div className="flex justify-between items-start gap-2">
              <DialogTitle className="flex-grow">
                <div className="group relative flex items-center">
                  <Input
                    id="title"
                    value={currentTask.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="text-2xl font-headline border-0 shadow-none focus-visible:ring-0 p-0 h-auto w-full placeholder:text-muted-foreground/60 hover:bg-muted/20 rounded-md px-2 py-1 transition-colors"
                    placeholder="Enter task title"
                  />
                </div>
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (currentTask) {
                    onArchiveTask(currentTask); 
                  }
                }}
                disabled={currentTask.isArchived}
                className="ml-auto text-muted-foreground hover:text-destructive flex-shrink-0 mt-1"
                title={currentTask.isArchived ? 'Task Archived' : 'Archive Task'}
              >
                <Archive className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-xs text-muted-foreground/80 mt-1 flex items-center">
              <Clock className="h-3 w-3 mr-1" /> Last updated: {format(parseISO(currentTask.updatedAt), 'MMM d, yyyy h:mm a')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow min-h-0 overflow-y-auto px-4">
            <ScrollArea className="h-full">
              <div className="grid gap-6 py-4">
                {/* Client Name input removed from here, it's on the workflow level now */}
                <div className="space-y-2">
                    <Label htmlFor="isBillable" className="text-sm font-semibold flex items-center text-foreground">
                      <DollarSign className="mr-2 h-4 w-4 text-primary" /> Billable Task
                    </Label>
                    <div className="flex items-center space-x-2 p-2.5 border border-border/50 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                      <Switch
                        id="isBillable"
                        checked={currentTask.isBillable}
                        onCheckedChange={(checked) => handleInputChange('isBillable', checked)}
                      />
                      <span className="text-sm text-muted-foreground">{currentTask.isBillable ? "Yes, this task is billable" : "No, this task is not billable"}</span>
                    </div>
                </div>


                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-semibold flex items-center text-foreground">
                    <Edit3 className="mr-2 h-4 w-4 text-primary" /> Task Details
                  </Label>
                  <Textarea
                    id="description"
                    value={currentTask.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe the task in detail..."
                    className="min-h-[80px] border-border/50 rounded-lg bg-background/50 hover:bg-background/70 focus:ring-primary/50 resize-y text-sm transition-colors"
                  />
                  <div className="flex space-x-3">
                    <Button
                      variant="ghost"
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing || (!currentTask.description && !currentTask.title)}
                      className={cn(
                        "text-xs font-medium flex items-center text-primary p-0 h-auto hover:bg-transparent hover:underline",
                        isSummarizing && 'animate-pulse'
                      )}
                    >
                      <Sparkles className="mr-1 h-3 w-3" /> {isSummarizing ? 'Generating...' : 'Client Update Draft'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSuggestSubtasks}
                      disabled={isSuggestingSubtasks || (!currentTask.description && !currentTask.title)}
                      className={cn(
                        "text-xs font-medium flex items-center text-primary p-0 h-auto hover:bg-transparent hover:underline",
                        isSuggestingSubtasks && 'animate-pulse'
                      )}
                    >
                      <ListChecks className="mr-1 h-3 w-3" /> {isSuggestingSubtasks ? 'Suggesting...' : 'Break Down Task'}
                    </Button>
                  </div>
                  {aiSummary && (
                    <div className="mt-2 p-3 border border-border/50 rounded-lg bg-muted/30 backdrop-blur-sm">
                      <p className="text-xs font-semibold text-primary flex items-center">
                        <Brain className="mr-1 h-3 w-3" /> AI-Generated Draft
                      </p>
                      <p className="text-xs text-foreground/90 mt-1">{aiSummary.summary}</p>
                    </div>
                  )}
                  {aiSubtaskSuggestions.length > 0 && (
                    <div className="mt-2 p-3 border border-border/50 rounded-lg bg-muted/30 backdrop-blur-sm">
                      <p className="text-xs font-semibold text-primary flex items-center">
                        <ListChecks className="mr-1 h-3 w-3" /> AI Suggested Steps
                      </p>
                      <ul className="list-none space-y-1 mt-1">
                        {aiSubtaskSuggestions.map((suggestion) => (
                          <li key={suggestion.id} className="text-xs text-foreground/90 flex justify-between items-center hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
                            <span>{suggestion.text}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleAddSubtask(suggestion.text, true)}
                              className="h-6 w-6 text-primary hover:text-primary/80"
                            >
                              <PlusCircle className="h-3 w-3" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="deliverables" className="text-sm font-semibold flex items-center text-foreground">
                      <Target className="mr-2 h-4 w-4 text-primary" /> Deliverables
                  </Label>
                  {currentTask.deliverables && currentTask.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                          <span className="flex-grow text-sm text-foreground">{deliverable}</span>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                              onClick={() => handleRemoveDeliverable(index)}
                              aria-label={`Delete deliverable ${deliverable}`}
                          >
                              <Trash2 className="h-3 w-3" />
                          </Button>
                      </div>
                  ))}
                  <div className="flex items-center space-x-2">
                      <Input
                          value={newDeliverable}
                          onChange={(e) => setNewDeliverable(e.target.value)}
                          placeholder="Add a deliverable..."
                          onKeyPress={(e) => e.key === 'Enter' && handleAddDeliverable()}
                          className="border-border/50 bg-background/50 hover:bg-background/70 rounded-lg text-sm transition-colors"
                      />
                      <Button
                          onClick={handleAddDeliverable}
                          size="icon"
                          disabled={!newDeliverable.trim()}
                          className="rounded-full bg-primary/90 hover:bg-primary"
                      >
                          <PlusCircle className="h-4 w-4" />
                      </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate" className="text-sm font-semibold flex items-center text-foreground">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" /> Due Date & Time
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="dueDate"
                          variant="outline"
                          className="w-full justify-start text-left text-sm font-normal border-border/50 bg-background/50 hover:bg-background/70"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary/80" />
                          {currentTask.dueDate ? format(parseISO(currentTask.dueDate), 'PPP h:mm a') : <span className="text-muted-foreground/60">Select date & time</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-background/95 border-border/50 rounded-lg shadow-lg">
                        <Calendar
                          mode="single"
                          selected={currentTask.dueDate ? parseISO(currentTask.dueDate) : undefined}
                          onSelect={handleDateTimeSelect}
                          className="rounded-md border border-border/50"
                        />
                        <div className="mt-2 flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-24 border-border/50 text-sm"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority" className="text-sm font-semibold flex items-center text-foreground">
                      <Sparkles className="mr-2 h-4 w-4 text-primary" /> Priority
                    </Label>
                    <Select
                      value={currentTask.priority}
                      onValueChange={(value) => handleInputChange('priority', value)}
                    >
                      <SelectTrigger className="w-full border-border/50 bg-background/50 hover:bg-background/70 text-sm">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 border-border/50">
                        {priorityOptions.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            <span className={cn("inline-block px-2 py-1 rounded-full text-xs", priorityColors[p])}>
                              {p}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignees" className="text-sm font-semibold flex items-center text-foreground">
                      <User className="mr-2 h-4 w-4 text-primary" /> Assignees
                    </Label>
                    <div className="flex items-center space-x-2 p-2 border border-border/50 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                      {assignee && currentTask.assigneeIds?.includes(assignee.id) ? (
                        <Avatar className="h-6 w-6" title={assignee.name || undefined}>
                          <AvatarImage src={assignee.avatarUrl || undefined} alt={assignee.name || 'User'} />
                          <AvatarFallback className="text-xs">{assignee.name ? assignee.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">No assignees</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-primary hover:text-primary/80"
                        onClick={() => toast({ title: "Coming Soon", description: "Assignee selection coming soon." })}
                        aria-label="Add assignee"
                      >
                        <PlusCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center text-foreground">
                    <ListChecks className="mr-2 h-4 w-4 text-primary" /> Subtasks / Action Items
                  </Label>
                  {currentTask.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center space-x-2 p-2 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors">
                      <Checkbox
                        id={`subtask-${subtask.id}`}
                        checked={subtask.completed}
                        onCheckedChange={(checked) => handleSubtaskChange(subtask.id, !!checked)}
                        className="border-border/50"
                      />
                      <Label
                        htmlFor={`subtask-${subtask.id}`}
                        className={cn("flex-grow text-sm", subtask.completed ? 'line-through text-muted-foreground/60' : 'text-foreground')}
                      >
                        {subtask.text}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground/60 hover:text-destructive"
                        onClick={() => toast({ title: "Coming Soon", description: "Subtask deletion coming soon." })}
                        aria-label={`Delete subtask ${subtask.text}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Add an action item or subtask..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(newSubtask)}
                      className="border-border/50 bg-background/50 hover:bg-background/70 rounded-lg text-sm transition-colors"
                    />
                    <Button
                      onClick={() => handleAddSubtask(newSubtask)}
                      size="icon"
                      disabled={!newSubtask.trim()}
                      className="rounded-full bg-primary/90 hover:bg-primary"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center text-foreground">
                    <Paperclip className="mr-2 h-4 w-4 text-primary" /> Attachments
                  </Label>
                  <Button
                    variant="outline"
                    className="w-full border-border/50 bg-background/50 hover:bg-background/70 text-sm"
                    onClick={() => toast({ title: "Coming Soon", description: "File attachments coming soon." })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload Attachment
                  </Button>
                </div>

                <Separator className="my-3 border-border/50" />

                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center text-foreground">
                    <MessageSquare className="mr-2 h-4 w-4 text-primary" /> Comments / Notes
                  </Label>
                  <ScrollArea className="max-h-48 border border-border/50 rounded-lg bg-background/50 p-3">
                    {currentTask.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-3 py-2 border-b border-border/30 last:border-b-0 hover:bg-muted/10 rounded transition-colors">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={comment.userAvatarUrl || undefined} alt={comment.userName} />
                          <AvatarFallback className="text-xs">{comment.userName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-foreground">{comment.userName}</p>
                            <p className="text-xs text-muted-foreground/60">{format(parseISO(comment.createdAt), 'MMM d, h:mm a')}</p>
                          </div>
                          <p className="text-xs text-foreground/90 mt-0.5">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                    {currentTask.comments.length === 0 && <p className="text-xs text-muted-foreground/60 p-2">No comments or internal notes yet.</p>}
                  </ScrollArea>
                  {user && (
                    <>
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-7 w-7 mt-1">
                          <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} />
                          <AvatarFallback className="text-xs">{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment or note..."
                          className="flex-grow border-border/50 bg-background/50 hover:bg-background/70 rounded-lg resize-none h-16 text-sm transition-colors"
                        />
                      </div>
                      <div className="text-right">
                        <Button
                          onClick={handleAddComment}
                          size="sm"
                          disabled={!newComment.trim()}
                          className="rounded-full bg-primary/90 hover:bg-primary"
                        >
                          Post
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
