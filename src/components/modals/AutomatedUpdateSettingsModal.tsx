
// src/components/modals/AutomatedUpdateSettingsModal.tsx
"use client";
import React from 'react';
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
import type { Workflow } from '@/types';
import { Settings, Mail, Repeat, Info, CalendarClock, Clock } from 'lucide-react'; // Added Info
import { useToast } from '@/hooks/use-toast';


interface AutomatedUpdateSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: Workflow | null;
  onWorkflowSettingsUpdate: (updatedWorkflowData: Partial<Workflow>) => void; // Kept for potential future use with non-CRON settings
}

export function AutomatedUpdateSettingsModal({
  isOpen,
  onClose,
  workflow,
  onWorkflowSettingsUpdate,
}: AutomatedUpdateSettingsModalProps) {
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    // For now, this save button doesn't do anything related to CRON jobs.
    // It could be used for other workflow-specific settings in the future.
    if (!workflow) {
      toast({ title: "Error", description: "No workflow selected.", variant: "destructive" });
      return;
    }
    // Example: Update workflow clientName if it were editable here
    // await updateWorkflow(workflow.id, { clientName: workflowClientName });
    // onWorkflowSettingsUpdate({ id: workflow.id, clientName: workflowClientName });
    toast({ title: "Settings (Placeholder)", description: "Automation settings will be configurable in a future update." });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5 text-primary" />
            Automated Client Update Settings
          </DialogTitle>
          <DialogDescription>
            Configure automated email updates for "{workflow?.name || 'this workflow'}". This feature is currently under development.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg bg-muted/30">
            <Label htmlFor="enable-auto-updates" className="text-sm font-medium cursor-pointer flex items-center">
              <Switch
                id="enable-auto-updates-switch" // Changed ID to avoid conflict with Label's htmlFor
                checked={false} // Default to false, as feature is placeholder
                disabled // Disabled as it's a placeholder
                className="mr-2"
              />
              Enable Automated Updates
            </Label>
            
          </div>
          
          <div className="p-4 border rounded-lg bg-amber-50 border-amber-200 text-amber-700">
            <div className="flex items-start">
              <Info className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Feature Coming Soon!</p>
                <p className="text-xs">
                  The ability to set up recurring automated client updates (e.g., weekly, bi-weekly) and specify client email addresses directly here is under development. 
                  For now, you can manually generate client updates using the "Client Update" button on the board.
                </p>
              </div>
            </div>
          </div>


          {workflow?.clientName && (
            <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Currently Associated Client
                </Label>
                <Input
                  value={workflow.clientName}
                  readOnly
                  className="bg-muted/50 border-muted-foreground/30"
                />
                <p className="text-xs text-muted-foreground">
                  This client name is set in the workflow's general settings.
                </p>
            </div>
          )}
          
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSaveSettings} disabled> {/* Save button disabled */}
            Save Settings (Coming Soon)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
