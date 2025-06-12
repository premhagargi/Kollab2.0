
// src/app/analytics/page.tsx
"use client";
import React from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AnalyticsDashboardView } from '@/components/analytics/AnalyticsDashboardView';
import { AuthProvider } from '@/contexts/AuthContext';
// Removed imports and state related to boards/workflows as AppHeader now handles this internally for its dropdown if needed.
// The Analytics page itself doesn't need to manage workflow selection.

export default function AnalyticsPage() {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <AppHeader 
          workflows={[]} // Analytics page doesn't directly manage workflows; AppHeader fetches its own if needed for dropdown
          currentWorkflowId={null} // Not applicable here
          onSelectWorkflow={() => {}} // Not applicable here
          onWorkflowCreated={async () => null} // Not applicable here
          isLoadingWorkflows={true} // Reflects that this page isn't loading them
        />
        <main className="flex-1 overflow-auto pt-16">
          <AnalyticsDashboardView />
        </main>
      </div>
    </AuthProvider>
  );
}
