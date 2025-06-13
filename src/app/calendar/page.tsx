
// src/app/calendar/page.tsx
"use client";
import React from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { CalendarView } from '@/components/calendar/CalendarView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getWorkflowsByOwner, createWorkflow } from '@/services/workflowService';
import type { Workflow } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';


function CalendarPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [userWorkflows, setUserWorkflows] = React.useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = React.useState(true);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingWorkflows(true);
      getWorkflowsByOwner(user.id)
        .then(workflows => setUserWorkflows(workflows))
        .catch(error => {
          console.error("Error fetching workflows for header:", error);
          toast({ title: "Error", description: "Could not load workflows for header.", variant: "destructive" });
        })
        .finally(() => setIsLoadingWorkflows(false));
    } else if (!user && !authLoading) {
      setUserWorkflows([]);
      setIsLoadingWorkflows(false);
    }
  }, [user, authLoading, toast]);

  const handleWorkflowCreated = async (newWorkflowName: string, templateName?: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a workflow.", variant: "destructive" });
      return null;
    }
    try {
      const newWorkflow = await createWorkflow(user.id, newWorkflowName, templateName);
      setUserWorkflows(prev => [...prev, newWorkflow]);
      toast({ title: "Workflow Created", description: `Workflow "${newWorkflow.name}" created.` });
      router.push(`/?workflowId=${newWorkflow.id}`); // Navigate to dashboard with new workflow selected
      return newWorkflow.id;
    } catch (error) {
      console.error("Error creating workflow from calendar page:", error);
      toast({ title: "Error", description: "Failed to create workflow.", variant: "destructive" });
      return null;
    }
  };

  const handleSelectWorkflow = (workflowId: string) => {
    router.push(`/?workflowId=${workflowId}`);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader
            workflows={[]}
            currentWorkflowId={null}
            onSelectWorkflow={() => {}}
            onWorkflowCreated={async () => null}
            isLoadingWorkflows={true}
        />
        <main className="flex-1 flex items-center justify-center pt-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!user) {
     return (
       <div className="flex flex-col min-h-screen">
         <AppHeader
            workflows={[]}
            currentWorkflowId={null}
            onSelectWorkflow={() => {}}
            onWorkflowCreated={async () => null}
            isLoadingWorkflows={true}
         />
         <main className="flex-1 flex flex-col items-center justify-center text-center pt-16 p-4">
            <LogIn className="h-16 w-16 text-muted-foreground mb-6" />
            <h2 className="text-2xl font-semibold mb-2">Please Log In</h2>
            <p className="text-muted-foreground max-w-md">
              To view your calendar and manage your tasks, you need to be logged in.
            </p>
         </main>
       </div>
     );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader
        workflows={userWorkflows}
        currentWorkflowId={null}
        onSelectWorkflow={handleSelectWorkflow}
        onWorkflowCreated={handleWorkflowCreated}
        isLoadingWorkflows={isLoadingWorkflows}
      />
      <main className="flex-1 overflow-auto pt-16">
        <CalendarView />
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <AuthProvider>
      <CalendarPageContent />
    </AuthProvider>
  );
}
