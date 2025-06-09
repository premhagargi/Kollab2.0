// src/components/modals/InviteTeamMemberModal.tsx
"use client";
import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { TeamMemberInvite } from '@/types';
import { Users, Mail } from 'lucide-react';

interface InviteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onInvite: (inviteDetails: TeamMemberInvite) => void; // Placeholder for actual invite logic
}

export function InviteTeamMemberModal({ isOpen, onClose }: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const { toast } = useToast();

  const handleInvite = () => {
    if (!email.trim()) {
      toast({ title: "Error", description: "Email cannot be empty.", variant: "destructive" });
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
        return;
    }

    // onInvite({ email, role }); // Placeholder for actual invite logic
    toast({ title: "Invite Sent (Mock)", description: `Invitation sent to ${email} with role ${role}.` });
    setEmail('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Invite Team Member</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this workspace.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: 'editor' | 'viewer') => setRole(value)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor (Can edit tasks and boards)</SelectItem>
                <SelectItem value="viewer">Viewer (Can only view)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleInvite}>Send Invite</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
