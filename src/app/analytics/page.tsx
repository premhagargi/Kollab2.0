// src/app/analytics/page.tsx
"use client";
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { AuthProvider } from '@/contexts/AuthContext';
import { mockBoard } from '@/lib/mock-data'; // For sidebar consistency

export default function AnalyticsPage() {
  // This state is just for sidebar consistency; analytics view itself doesn't depend on a board.
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(mockBoard.id);

  const handleSelectBoard = (boardId: string) => {
    setCurrentBoardId(boardId);
    // Typically, navigation would happen here if boards affected analytics,
    // or analytics might be workspace-wide.
  };
  
  return (
    <AuthProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen">
          <AppSidebar 
            currentBoardId={currentBoardId} 
            onSelectBoard={handleSelectBoard}
          />
          <div className="flex flex-col flex-1 w-full">
            <AppHeader />
            <main className="flex-1 overflow-auto"> {/* Allow scrolling for analytics content */}
              <AnalyticsDashboardView />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}
