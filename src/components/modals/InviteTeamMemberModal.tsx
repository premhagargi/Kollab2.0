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
import { Users, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sendTeamInvitationEmailAction } from '@/actions/emailActions';


interface InviteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteTeamMemberModal({ isOpen, onClose }: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInvite = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to send invites.", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Email cannot be empty.", variant: "destructive" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast({ title: "Error", description: "Please enter a valid email address.", variant: "destructive" });
        return;
    }

    setIsInviting(true);
    console.log(`[InviteModal] User '${user.name || user.email}' is attempting to invite '${email}' with role '${role}'.`);

    try {
      const result = await sendTeamInvitationEmailAction({
        toEmail: email,
        workspaceName: "your Kollab workspace", // TODO: Make this dynamic, perhaps pass current board/workspace name
        inviterName: user.name || "A Kollab User",
        // inviteLink: `${window.location.origin}/accept-invite?token=...` // Generate a unique token later
      });

      if (result.success) {
        toast({ title: "Invite Sent", description: result.message });
        setEmail('');
        setRole('editor');
        onClose();
      } else {
        toast({ title: "Invite Failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error sending invite from modal:", error);
      toast({ title: "Invite Error", description: "An unexpected error occurred while trying to send the invite.", variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open && !isInviting) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> Invite Team Member</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to your workspace.
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
              disabled={isInviting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: 'editor' | 'viewer') => setRole(value)} disabled={isInviting}>
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
          <Button variant="outline" onClick={onClose} disabled={isInviting}>Cancel</Button>
          <Button onClick={handleInvite} disabled={isInviting || !email.trim()}>
            {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
