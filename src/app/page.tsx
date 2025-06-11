
// src/app/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getBoardsByOwner } from '@/services/boardService';
import type { Board } from '@/types';
import { Loader2 } from 'lucide-react';


function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [isLoadingInitialBoard, setIsLoadingInitialBoard] = useState(true);

  useEffect(() => {
    if (user && !currentBoardId) { 
      setIsLoadingInitialBoard(true);
      getBoardsByOwner(user.id)
        .then(boards => {
          if (boards.length > 0) {
            setCurrentBoardId(boards[0].id); 
          } else {
            setCurrentBoardId(null); 
          }
        })
        .catch(error => {
          console.error("Error fetching initial boards:", error);
          setCurrentBoardId(null);
        })
        .finally(() => {
          setIsLoadingInitialBoard(false);
        });
    } else if (!user && !authLoading) { 
        setCurrentBoardId(null);
        setIsLoadingInitialBoard(false);
    }
  }, [user, authLoading, currentBoardId]);


  const handleSelectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
  };

  const handleBoardCreated = (newBoardId: string) => {
    setCurrentBoardId(newBoardId); 
  };
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex flex-1 min-h-0"> {/* Ensure flex-1 and min-h-0 for proper scrolling */}
        <AppSidebar
          currentBoardId={currentBoardId}
          onSelectBoard={handleSelectBoard}
          onBoardCreated={handleBoardCreated}
        />
        <div className="flex flex-col flex-1 w-full min-w-0"> {/* Ensure min-w-0 here */}
          <AppHeader /> {/* This is sticky */}
          <main className="flex-1 overflow-hidden"> {/* This should take remaining space and handle its own overflow */}
            {authLoading || (user && isLoadingInitialBoard && !currentBoardId && !authLoading) ? (
                <div className="flex flex-1 items-center justify-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : currentBoardId ? (
              <KanbanBoardView boardId={currentBoardId} />
            ) : user ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
                <h2 className="text-2xl font-semibold mb-2">No Boards Yet</h2>
                <p className="text-muted-foreground mb-4">Create your first board from the sidebar to get started!</p>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in mb-4 text-muted-foreground"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                <h2 className="text-2xl font-semibold mb-2">Welcome to Kollab</h2>
                <p className="text-muted-foreground mb-4">Please log in to view your boards and tasks.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}


export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
