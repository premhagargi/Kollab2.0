
// src/app/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getWorkflowsByOwner, createWorkflow as createWorkflowService } from '@/services/workflowService'; // Renamed
import type { Workflow } from '@/types'; // Renamed
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null); // Renamed
  const [userWorkflows, setUserWorkflows] = useState<Workflow[]>([]); // Renamed
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true); // Renamed
  const { toast } = useToast();

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingWorkflows(true);
      getWorkflowsByOwner(user.id) // Renamed
        .then(workflows => { // Renamed
          setUserWorkflows(workflows); // Renamed
          if (workflows.length > 0 && !currentWorkflowId) {
            setCurrentWorkflowId(workflows[0].id);
          } else if (workflows.length === 0) {
            setCurrentWorkflowId(null); 
          }
        })
        .catch(error => {
          console.error("Error fetching workflows for user:", error); // Renamed
          toast({ title: "Error", description: "Could not load your workflows.", variant: "destructive" }); // Renamed
          setUserWorkflows([]); // Renamed
          setCurrentWorkflowId(null);
        })
        .finally(() => {
          setIsLoadingWorkflows(false); // Renamed
        });
    } else if (!user && !authLoading) {
      setUserWorkflows([]); // Renamed
      setCurrentWorkflowId(null);
      setIsLoadingWorkflows(false); // Renamed
    }
  }, [user, authLoading, currentWorkflowId, toast]);


  const handleSelectWorkflow = (workflowId: string) => { // Renamed
    setCurrentWorkflowId(workflowId);
  };

  const handleWorkflowCreated = async (newWorkflowName: string, templateName?: string): Promise<string | null> => { // Renamed, added templateName
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a workflow.", variant: "destructive" }); // Renamed
      return null;
    }
    try {
      const newWorkflow = await createWorkflowService(user.id, newWorkflowName, templateName); // Renamed, passed templateName
      setUserWorkflows(prevWorkflows => [...prevWorkflows, newWorkflow]); // Renamed
      setCurrentWorkflowId(newWorkflow.id); 
      toast({ title: "Workflow Created", description: `Workflow "${newWorkflow.name}" has been created.` }); // Renamed
      return newWorkflow.id;
    } catch (error) {
      console.error("Error creating workflow from page:", error); // Renamed
      toast({ title: "Error", description: "Failed to create workflow.", variant: "destructive" }); // Renamed
      return null;
    }
  };
  
  return (
      <div className="flex flex-col h-screen">
        <AppHeader 
            workflows={userWorkflows} // Renamed
            currentWorkflowId={currentWorkflowId} // Renamed
            onSelectWorkflow={handleSelectWorkflow} // Renamed
            onWorkflowCreated={handleWorkflowCreated} // Renamed
            isLoadingWorkflows={isLoadingWorkflows} // Renamed
        />
        <main className="flex-1 flex flex-col overflow-hidden bg-background min-h-0 pt-16"> 
          {authLoading || (isLoadingWorkflows && user) ? ( // Renamed
              <div className="flex flex-1 items-center justify-center h-full">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
          ) : currentWorkflowId ? (
            <KanbanBoardView workflowId={currentWorkflowId} /> // Renamed prop
          ) : user ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
              <h2 className="text-2xl font-semibold mb-2">No Workflows Yet</h2>
              <p className="text-muted-foreground mb-4 max-w-md">
                Ready to organize your work? Create your first workflow for a client project, a personal goal, or to manage retainer tasks. Use the "Workflows" menu in the header to get started!
              </p>
            </div>
          ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in mb-4 text-muted-foreground"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              <h2 className="text-2xl font-semibold mb-2">Welcome to {siteConfig.name}</h2>
              <p className="text-muted-foreground mb-4">Your personal command center for freelance projects and tasks. Please log in to get started.</p>
            </div>
          )}
        </main>
      </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
