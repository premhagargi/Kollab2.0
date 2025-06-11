
// src/app/page.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { KanbanBoardView } from '@/components/kanban/KanbanBoardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { getBoardsByOwner, createBoard as createBoardService } from '@/services/boardService';
import type { Board } from '@/types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [userBoards, setUserBoards] = useState<Board[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(true);
  const { toast } = useToast();


  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingBoards(true);
      getBoardsByOwner(user.id)
        .then(boards => {
          setUserBoards(boards);
          if (boards.length > 0 && !currentBoardId) {
            setCurrentBoardId(boards[0].id);
          } else if (boards.length === 0) {
            setCurrentBoardId(null); 
          }
        })
        .catch(error => {
          console.error("Error fetching boards for user:", error);
          toast({ title: "Error", description: "Could not load your boards.", variant: "destructive" });
          setUserBoards([]);
          setCurrentBoardId(null);
        })
        .finally(() => {
          setIsLoadingBoards(false);
        });
    } else if (!user && !authLoading) {
      setUserBoards([]);
      setCurrentBoardId(null);
      setIsLoadingBoards(false);
    }
  }, [user, authLoading, currentBoardId, toast]);


  const handleSelectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
  };

  const handleBoardCreated = async (newBoardName: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a board.", variant: "destructive" });
      return null;
    }
    try {
      const newBoard = await createBoardService(user.id, newBoardName);
      setUserBoards(prevBoards => [...prevBoards, newBoard]);
      setCurrentBoardId(newBoard.id); 
      toast({ title: "Board Created", description: `Board "${newBoard.name}" has been created.` });
      return newBoard.id;
    } catch (error) {
      console.error("Error creating board from page:", error);
      toast({ title: "Error", description: "Failed to create board.", variant: "destructive" });
      return null;
    }
  };
  
  return (
      // This div ensures AppHeader and main content are stacked vertically and take full screen height
      <div className="flex flex-col h-screen">
        <AppHeader 
            boards={userBoards}
            currentBoardId={currentBoardId}
            onSelectBoard={handleSelectBoard}
            onBoardCreated={handleBoardCreated}
            isLoadingBoards={isLoadingBoards}
        />
        {/* pt-16 offsets content below the fixed AppHeader (h-16 from AppHeader) */}
        {/* flex-1 allows this main area to take up remaining vertical space */}
        {/* min-h-0 is crucial for flex children that need to scroll */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background min-h-0"> 
          {authLoading || (isLoadingBoards && user) ? (
              <div className="flex flex-1 items-center justify-center h-full">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
          ) : currentBoardId ? (
            // KanbanBoardView itself will be h-full of this main area
            <KanbanBoardView boardId={currentBoardId} />
          ) : user ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
              <h2 className="text-2xl font-semibold mb-2">No Boards Yet</h2>
              <p className="text-muted-foreground mb-4">Create your first board using the "Boards" menu in the header!</p>
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
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
    
