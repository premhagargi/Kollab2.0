
// src/components/modals/AutomatedUpdateSettingsModal.tsx
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Workflow } from '@/types';
import { updateWorkflow, calculateNextSendDate } from '@/services/workflowService';
import { Loader2, Settings, Mail, CalendarClock, Repeat, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface AutomatedUpdateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow | null;
  onWorkflowSettingsUpdate: (updatedWorkflowData: Partial<Workflow>) => void;
}

type Frequency = 'weekly' | 'biweekly';

export function AutomatedUpdateSettingsModal({
  isOpen,
  onClose,
  workflow,
  onWorkflowSettingsUpdate,
}: AutomatedUpdateSettingsModalProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [clientEmail, setClientEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (workflow) {
      setIsEnabled(workflow.autoUpdateEnabled || false);
      setFrequency(workflow.autoUpdateFrequency || 'weekly');
      setClientEmail(workflow.autoUpdateClientEmail || '');
    } else {
      // Reset form if no workflow (e.g., modal closed and reopened without a workflow)
      setIsEnabled(false);
      setFrequency('weekly');
      setClientEmail('');
    }
  }, [workflow, isOpen]);

  const handleSaveSettings = async () => {
    if (!workflow) {
      toast({ title: "Error", description: "No workflow selected.", variant: "destructive" });
      return;
    }
    if (isEnabled && !clientEmail.trim()) {
      toast({ title: "Client Email Required", description: "Please enter a client email address to enable automated updates.", variant: "destructive" });
      return;
    }
    if (isEnabled && clientEmail.trim() && !/\S+@\S+\.\S+/.test(clientEmail)) {
      toast({ title: "Invalid Email", description: "Please enter a valid client email address.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const updates: Partial<Workflow> = {
      autoUpdateEnabled: isEnabled,
      autoUpdateFrequency: isEnabled ? frequency : undefined,
      autoUpdateClientEmail: isEnabled ? clientEmail.trim() : undefined,
    };
    
    // If enabling or changing frequency, calculate next send date.
    // If disabling, service will clear autoUpdateNextSend.
    if (isEnabled) {
        updates.autoUpdateNextSend = calculateNextSendDate(frequency, workflow.autoUpdateLastSent ? new Date(workflow.autoUpdateLastSent) : new Date());
    }


    try {
      await updateWorkflow(workflow.id, updates);
      onWorkflowSettingsUpdate({ id: workflow.id, ...updates }); // Update parent state
      toast({ title: "Settings Saved", description: "Automated update settings have been updated." });
      onClose();
    } catch (error) {
      console.error("Error saving auto-update settings:", error);
      toast({ title: "Save Failed", description: "Could not save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const nextSendDisplay = workflow?.autoUpdateEnabled && workflow.autoUpdateNextSend 
    ? format(parseISO(workflow.autoUpdateNextSend), 'MMM d, yyyy \'at\' h:mm a')
    : 'Not scheduled';

  const lastSentDisplay = workflow?.autoUpdateLastSent
    ? format(parseISO(workflow.autoUpdateLastSent), 'MMM d, yyyy \'at\' h:mm a')
    : 'Never';


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Automated Client Update Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated email updates for "{workflow?.name || 'this workflow'}".
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg bg-muted/30">
            <Label htmlFor="enable-auto-updates" className="text-sm font-medium cursor-pointer">
              Enable Automated Updates
            </Label>
            <Switch
              id="enable-auto-updates"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={isSaving}
            />
          </div>

          {isEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="frequency" className="text-sm font-medium flex items-center">
                  <Repeat className="mr-2 h-4 w-4 text-muted-foreground" /> Update Frequency
                </Label>
                <Select value={frequency} onValueChange={(value: string) => setFrequency(value as Frequency)} disabled={isSaving}>
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail" className="text-sm font-medium flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Client Email Address
                </Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  disabled={isSaving}
                />
              </div>
            </>
          )}
          
          {workflow?.autoUpdateEnabled && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center">
                    <CalendarClock className="mr-2 h-3.5 w-3.5"/> 
                    Next update scheduled for: <strong>{nextSendDisplay}</strong>
                </div>
                 <div className="flex items-center">
                    <Clock className="mr-2 h-3.5 w-3.5"/> 
                    Last update sent: <strong>{lastSentDisplay}</strong>
                </div>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveSettings} disabled={isSaving || !workflow}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
