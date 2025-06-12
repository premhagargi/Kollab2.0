
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Copy, MessageSquareText, CalendarRange } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateClientProgressSummaryAction } from '@/actions/ai';
import type { ClientProgressSummaryOutput } from '@/ai/flows/client-progress-summary-flow';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth'; // Added useAuth

interface GenerateClientUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

type DateRangeOption = "allTime" | "thisWeek" | "last7Days" | "last30Days" | "custom";

export function GenerateClientUpdateModal({ isOpen, onClose, workflowId, workflowName }: GenerateClientUpdateModalProps) {
  const { user } = useAuth(); // Get user from auth context
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientContext, setClientContext] = useState('');
  const [selectedDateRangeOption, setSelectedDateRangeOption] = useState<DateRangeOption>("allTime");
  const [customDateRangeInput, setCustomDateRangeInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSummary(null);
      setClientContext('');
      setSelectedDateRangeOption("allTime");
      setCustomDateRangeInput('');
      setIsLoading(false);
    }
  }, [isOpen]);

  const getDateRangeContextString = (): string | undefined => {
    switch (selectedDateRangeOption) {
      case "thisWeek":
        return "Focus on progress made this current week.";
      case "last7Days":
        return "Focus on progress made in the last 7 days.";
      case "last30Days":
        return "Focus on progress made in the last 30 days.";
      case "custom":
        return customDateRangeInput.trim() ? `Custom date range: ${customDateRangeInput.trim()}` : undefined;
      case "allTime":
      default:
        return undefined;
    }
  };

  const handleGenerateSummary = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to generate summaries.", variant: "destructive"});
      return;
    }
    if (!workflowId || !workflowName) {
        toast({ title: "Error", description: "Workflow information is missing.", variant: "destructive"});
        return;
    }
    if (selectedDateRangeOption === "custom" && !customDateRangeInput.trim()) {
      toast({ title: "Custom Range Needed", description: "Please enter a description for your custom date range or select another option.", variant: "destructive"});
      return;
    }

    setIsLoading(true);
    setSummary(null);
    const dateContextString = getDateRangeContextString();

    try {
      const result: ClientProgressSummaryOutput = await generateClientProgressSummaryAction(
        user.id, // Pass userId
        workflowId,
        workflowName,
        clientContext,
        dateContextString
      );
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
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-background border-border/50 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-semibold">
            <MessageSquareText className="mr-2 h-5 w-5 text-primary" />
            Generate Client Update for "{workflowName}"
          </DialogTitle>
          <DialogDescription>
            Configure options for the AI to draft a progress update.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center">
              <CalendarRange className="mr-2 h-4 w-4 text-primary" />
              Date Range for Summary
            </Label>
            <RadioGroup value={selectedDateRangeOption} onValueChange={(value: string) => setSelectedDateRangeOption(value as DateRangeOption)} disabled={isLoading}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="allTime" id="dr_allTime" />
                <Label htmlFor="dr_allTime" className="font-normal text-sm">Summarize everything I’ve done here</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="thisWeek" id="dr_thisWeek" />
                <Label htmlFor="dr_thisWeek" className="font-normal text-sm">This Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last7Days" id="dr_last7Days" />
                <Label htmlFor="dr_last7Days" className="font-normal text-sm">Last 7 Days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last30Days" id="dr_last30Days" />
                <Label htmlFor="dr_last30Days" className="font-normal text-sm">Last 30 Days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="dr_custom" />
                <Label htmlFor="dr_custom" className="font-normal text-sm">Custom Range</Label>
              </div>
            </RadioGroup>
            {selectedDateRangeOption === "custom" && (
              <Input
                value={customDateRangeInput}
                onChange={(e) => setCustomDateRangeInput(e.target.value)}
                placeholder="e.g., June 1st - June 15th, or 'Last Sprint'"
                className="mt-2 text-sm border-border/70 bg-muted/30 focus:ring-primary/50"
                disabled={isLoading}
              />
            )}
          </div>

          <Separator />

          {/* Client Context Input */}
          <div className="space-y-2">
            <Label htmlFor="clientContext" className="text-sm font-semibold">
              Additional Context (Optional)
            </Label>
            <Input
              id="clientContext"
              value={clientContext}
              onChange={(e) => setClientContext(e.target.value)}
              placeholder="e.g., Project milestone, focus on design tasks..."
              className="mt-1 text-sm border-border/70 bg-muted/30 focus:ring-primary/50"
              disabled={isLoading}
            />
             <p className="text-xs text-muted-foreground mt-1">
              Help the AI tailor the update. To focus on specific tasks, mention their titles or IDs here.
            </p>
          </div>

          <Button onClick={handleGenerateSummary} disabled={isLoading || !workflowId || !user} className="w-full bg-primary hover:bg-primary/90 mt-4">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {summary ? 'Regenerate Summary' : 'Generate Summary'}
          </Button>

          {summary && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="summaryOutput" className="text-sm font-semibold">Generated Summary</Label>
              <Textarea
                id="summaryOutput"
                value={summary}
                readOnly
                className="min-h-[150px] text-sm bg-muted/30 border-border/70 rounded-md"
                placeholder="AI-generated summary will appear here..."
              />
              <Button onClick={handleCopySummary} variant="outline" size="sm" className="w-full border-border/70 hover:bg-muted/50">
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="border-border/70 hover:bg-muted/50">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
