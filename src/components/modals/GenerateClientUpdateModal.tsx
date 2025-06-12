
// src/components/modals/GenerateClientUpdateModal.tsx
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Copy, MessageSquareText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import type { ClientProgressSummaryOutput } from '@/ai/flows/client-progress-summary-flow';

interface GenerateClientUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

export function GenerateClientUpdateModal({ isOpen, onClose, workflowId, workflowName }: GenerateClientUpdateModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientContext, setClientContext] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSummary(null);
      setClientContext('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleGenerateSummary = async () => {
    if (!workflowId || !workflowName) {
        toast({ title: "Error", description: "Workflow information is missing.", variant: "destructive"});
        return;
    }
    setIsLoading(true);
    setSummary(null);
    try {
      const result: ClientProgressSummaryOutput = await generateClientProgressSummaryAction(workflowId, workflowName, clientContext);
      if (result.summaryText.startsWith('Error:')) {
        toast({ title: "Generation Failed", description: result.summaryText, variant: "destructive" });
        setSummary(null);
      } else {
        setSummary(result.summaryText);
        toast({ title: "Summary Generated", description: "Client update draft is ready." });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ title: "Generation Error", description: errorMessage, variant: "destructive" });
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary).then(() => {
        toast({ title: "Copied!", description: "Summary copied to clipboard." });
      }).catch(err => {
        toast({ title: "Copy Failed", description: "Could not copy summary.", variant: "destructive" });
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background border-border/50 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold">
            <MessageSquareText className="mr-2 h-5 w-5 text-primary" />
            Generate Client Update for "{workflowName}"
          </DialogTitle>
          <DialogDescription>
            Provide optional context, then generate an AI-drafted progress update for your client.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="clientContext" className="text-sm font-medium">
              Client Context (Optional)
            </Label>
            <Input
              id="clientContext"
              value={clientContext}
              onChange={(e) => setClientContext(e.target.value)}
              placeholder="e.g., Weekly update, project milestone achieved, addressing feedback..."
              className="mt-1 text-sm border-border/70 bg-muted/30 focus:ring-primary/50"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Help the AI tailor the update (e.g., "focus on design tasks", "keep it very brief").
            </p>
          </div>

          <Button onClick={handleGenerateSummary} disabled={isLoading || !workflowId} className="w-full bg-primary hover:bg-primary/90">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {summary ? 'Regenerate Summary' : 'Generate Summary'}
          </Button>

          {summary && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="summaryOutput" className="text-sm font-medium">Generated Summary</Label>
              <Textarea
                id="summaryOutput"
                value={summary}
                readOnly
                className="min-h-[200px] text-sm bg-muted/30 border-border/70 rounded-md"
                placeholder="AI-generated summary will appear here..."
              />
              <Button onClick={handleCopySummary} variant="outline" size="sm" className="w-full border-border/70 hover:bg-muted/50">
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-border/70 hover:bg-muted/50">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
