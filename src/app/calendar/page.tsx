// src/app/calendar/page.tsx
// This page is no longer used. The calendar functionality has been integrated
// into the main dashboard page (src/app/page.tsx) as a toggleable left sidebar.
// This file can be safely deleted.

"use client";
import React from 'react';

export default function DeprecatedCalendarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-semibold mb-4">Calendar Page (Deprecated)</h1>
      <p className="text-muted-foreground">
        The calendar functionality has been moved. You can now access it as a toggleable
        sidebar on the main dashboard page.
      </p>
    </div>
  );
}
