
// src/app/analytics/page.tsx
"use client";
import React from 'react';
// Removed SidebarProvider
import { AppHeader } from '@/components/layout/AppHeader';
// Removed AppSidebar
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { AuthProvider } from '@/contexts/AuthContext';
// Removed mockBoard import as sidebar and its related state are gone

export default function AnalyticsPage() {
  // Removed currentBoardId and handleSelectBoard as sidebar is gone
  // If boards list is needed for AppHeader in analytics, it should be fetched similarly to DashboardPage
  
  return (
    <AuthProvider>
      {/* Removed SidebarProvider */}
      <div className="flex flex-col min-h-screen"> {/* Simplified layout */}
        <AppHeader 
          boards={[]} // Pass empty or fetch if needed for "Boards" dropdown consistency
          currentBoardId={null}
          onSelectBoard={() => {}}
          onBoardCreated={async () => null}
          isLoadingBoards={false}
        />
        <main className="flex-1 overflow-auto pt-16"> {/* pt-16 to offset AppHeader height */}
          <AnalyticsDashboardView />
        </main>
      </div>
    </AuthProvider>
  );
}
    