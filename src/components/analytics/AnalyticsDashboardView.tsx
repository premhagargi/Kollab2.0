
// src/components/analytics/AnalyticsDashboardView.tsx
"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, LineChart, PieChart, ListChecks, Clock, Zap } from 'lucide-react'; // Removed Users, Added Zap
import Image from 'next/image';

const mockAnalyticsData = {
  totalTasks: 125,
  completedTasks: 78,
  activeProjects: 5, // Changed from teamMembers
  avgCompletionTime: '3.5 days',
  tasksPerStatus: [
    { name: 'To Do', value: 22, fill: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: 25, fill: 'hsl(var(--chart-2))' },
    { name: 'In Review', value: 10, fill: 'hsl(var(--chart-3))' },
    { name: 'Done', value: 78, fill: 'hsl(var(--chart-4))' },
  ],
  activityOverTime: [
    { name: 'Mon', tasksCompleted: 5, tasksCreated: 8 },
    { name: 'Tue', tasksCompleted: 7, tasksCreated: 6 },
    { name: 'Wed', tasksCompleted: 4, tasksCreated: 5 },
    { name: 'Thu', tasksCompleted: 9, tasksCreated: 7 },
    { name: 'Fri', tasksCompleted: 6, tasksCreated: 4 },
    { name: 'Sat', tasksCompleted: 3, tasksCreated: 2 },
    { name: 'Sun', tasksCompleted: 2, tasksCreated: 1 },
  ],
};

export function AnalyticsDashboardView() {
  const completionPercentage = mockAnalyticsData.totalTasks > 0 
    ? (mockAnalyticsData.completedTasks / mockAnalyticsData.totalTasks) * 100 
    : 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">My Productivity Insights</h1>
        <CardDescription>Track your progress and work patterns.</CardDescription>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalyticsData.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Across all your workflows</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <ListChecks className="h-5 w-5 text-primary" /> {/* Changed color */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalyticsData.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completionPercentage.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects/Clients</CardTitle> {/* Changed title */}
            <Zap className="h-5 w-5 text-muted-foreground" /> {/* Changed icon */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalyticsData.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Task Time</CardTitle> {/* Simplified title */}
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockAnalyticsData.avgCompletionTime}</div>
            <p className="text-xs text-muted-foreground">For completed tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/> Task Activity</CardTitle> {/* Simplified */}
            <CardDescription>Tasks created vs. completed over the last week.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px] w-full flex items-center justify-center bg-muted/50 rounded-md">
               <Image src="https://placehold.co/600x350.png" alt="Task Activity Chart Placeholder" width={600} height={350} data-ai-hint="bar chart graph" />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary"/> Tasks by Status</CardTitle>
            <CardDescription>Distribution of tasks across different statuses.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[350px] w-full flex items-center justify-center bg-muted/50 rounded-md">
               <Image src="https://placehold.co/400x350.png" alt="Tasks by Status Chart Placeholder" width={400} height={350} data-ai-hint="pie chart graph" />
            </div>
          </CardContent>
        </Card>
      </div>
       <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><LineChart className="mr-2 h-5 w-5 text-primary"/> My Work Velocity</CardTitle> {/* Renamed */}
            <CardDescription>Trend of task completion over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center bg-muted/50 rounded-md">
              <Image src="https://placehold.co/800x300.png" alt="Work Velocity Chart Placeholder" width={800} height={300} data-ai-hint="line graph business" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
