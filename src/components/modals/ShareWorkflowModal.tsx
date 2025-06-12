
// src/components/modals/ShareWorkflowModal.tsx
// Renamed from InviteTeamMemberModal.tsx
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
import { Input } from '@/components/ui/input';
import { Share2, Link as LinkIcon, Eye } from 'lucide-react'; // Changed icons
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShareWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkflowName?: string | null;
}

export function ShareWorkflowModal({ isOpen, onClose, currentWorkflowName }: ShareWorkflowModalProps) {
  const { toast } = useToast();
  const shareableLink = typeof window !== 'undefined' ? window.location.href : ''; // Basic link for now

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink).then(() => {
      toast({ title: "Link Copied!", description: "Workflow link copied to your clipboard." });
    }).catch(err => {
      toast({ title: "Copy Failed", description: "Could not copy link. Please try manually.", variant: "destructive" });
      console.error('Failed to copy link: ', err);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Share2 className="mr-2 h-5 w-5 text-primary" /> Share Workflow{currentWorkflowName ? `: ${currentWorkflowName}` : ''}</DialogTitle>
          <DialogDescription>
            Share a link to this workflow for client previews or collaboration. (Advanced sharing options coming soon!)
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                Currently, sharing provides a direct link to this workflow. Ensure the recipient has the necessary access if it's not a public workflow.
            </p>
            <div className="flex w-full items-center space-x-2 mt-2">
                <Input
                    id="shareLink"
                    value={shareableLink}
                    readOnly
                    className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleCopyLink}>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copy Link
                </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
