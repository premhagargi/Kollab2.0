
// src/components/layout/AppHeader.tsx
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, LogOut, Settings, LogInIcon, Mail, LayoutDashboard, BarChart3, ChevronDown, PlusCircle, Loader2, HardDrive, Share2, FileText, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { siteConfig } from '@/config/site';
import { ShareWorkflowModal } from '@/components/modals/ShareWorkflowModal';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
// Login/Signup forms are no longer imported here
import type { Workflow } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';

// GoogleIcon is no longer needed here as login modal is removed.

interface AppHeaderProps {
  workflows: Workflow[];
  currentWorkflowId: string | null;
  onSelectWorkflow: (workflowId: string) => void;
  onWorkflowCreated: (newWorkflowName: string, templateName?: string) => Promise<string | null>;
  isLoadingWorkflows: boolean;
  onToggleCalendarSidebar?: () => void;
  isCalendarSidebarVisible?: boolean;
}

const workflowTemplates = [
  { value: "Blank Workflow", label: "Blank Workflow" },
  { value: "Freelance Project", label: "Freelance Project" },
  { value: "Content Creation", label: "Content Creation" },
  { value: "Social Media Content Calendar", label: "Social Media Content Calendar" },
  { value: "Weekly Solo Sprint", label: "Weekly Solo Sprint" },
];

export function AppHeader({ workflows, currentWorkflowId, onSelectWorkflow, onWorkflowCreated, isLoadingWorkflows, onToggleCalendarSidebar, isCalendarSidebarVisible }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, logout, loading: authLoading } = useAuth(); // loginWithGoogle and authView state removed
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // isLoginModalOpen state removed
  const [isCreateWorkflowModalOpen, setIsCreateWorkflowModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(workflowTemplates[0].value);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // handleLoginSuccess function removed

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    setIsCreatingWorkflow(true);
    const newWorkflowId = await onWorkflowCreated(newWorkflowName, selectedTemplate);
    if (newWorkflowId) {
      setNewWorkflowName('');
      setSelectedTemplate(workflowTemplates[0].value);
      setIsCreateWorkflowModalOpen(false);
    }
    setIsCreatingWorkflow(false);
  };

  // If auth is loading or user is not present (which shouldn't happen if this header is on protected routes),
  // you might want to render a loading state or null, but for now, it assumes user is present if this header is shown.
  if (!user && !authLoading) {
     // This should ideally not be hit if routing is correct (AppHeader on protected routes)
     // Or if on a public page that can show this header conditionally
    return null; // Or a minimal public header
  }


  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 flex-shrink-0">
      <div className="container mx-auto flex h-full items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="font-bold font-headline text-xl">{siteConfig.name}</span>
          </Link>
          
          {user && ( // This check is somewhat redundant if header is only for authenticated users
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant={pathname === '/' ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
              </Button>
              <Button variant={pathname === '/analytics' ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />My Insights</Link>
              </Button>

              {onToggleCalendarSidebar && pathname === '/' && ( // Only show calendar toggle on dashboard
                <Button 
                  variant={isCalendarSidebarVisible ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={onToggleCalendarSidebar}
                  title={isCalendarSidebarVisible ? "Hide Calendar Sidebar" : "Show Calendar Sidebar"}
                >
                  <CalendarDays className="mr-2 h-4 w-4" /> Calendar
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <HardDrive className="mr-2 h-4 w-4" /> Workflows <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Your Workflows</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingWorkflows ? (
                    <DropdownMenuItem disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </DropdownMenuItem>
                  ) : workflows.length === 0 ? (
                    <DropdownMenuItem disabled>No workflows yet.</DropdownMenuItem>
                  ) : (
                    <ScrollArea className="max-h-60">
                      {workflows.map(workflow => (
                        <DropdownMenuItem 
                          key={workflow.id} 
                          onClick={() => onSelectWorkflow(workflow.id)}
                          className={cn(currentWorkflowId === workflow.id && "bg-accent text-accent-foreground")}
                        >
                          {workflow.name}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsCreateWorkflowModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Workflow...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          )}
        </div>

        <div className="flex-grow" />

        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          <ThemeToggleButton />
          {authLoading && !user ? ( 
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted"></div> // Loading placeholder for user section
          ) : user ? (
            <>
            <Button variant="ghost" onClick={() => setIsShareModalOpen(true)} disabled={authLoading} size="sm" className="hidden sm:inline-flex">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full" disabled={authLoading}>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="md:hidden"> {/* Mobile specific menu items */}
                   <DropdownMenuItem asChild>
                     <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                   </DropdownMenuItem>
                   {onToggleCalendarSidebar && pathname === '/' && (
                      <DropdownMenuItem onClick={onToggleCalendarSidebar}>
                        <CalendarDays className="mr-2 h-4 w-4" /> {isCalendarSidebarVisible ? "Hide Calendar" : "Show Calendar"}
                      </DropdownMenuItem>
                    )}
                   <DropdownMenuItem asChild>
                     <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />My Insights</Link>
                   </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger><HardDrive className="mr-2 h-4 w-4" />Workflows</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-48">
                          <DropdownMenuLabel>Your Workflows</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                            {isLoadingWorkflows ? (
                              <DropdownMenuItem disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                              </DropdownMenuItem>
                            ) : workflows.length === 0 ? (
                              <DropdownMenuItem disabled>No workflows yet.</DropdownMenuItem>
                            ) : (
                               <ScrollArea className="max-h-48">
                                {workflows.map(workflow => (
                                  <DropdownMenuItem key={workflow.id} onClick={() => onSelectWorkflow(workflow.id)}
                                   className={cn(currentWorkflowId === workflow.id && "bg-accent text-accent-foreground")}>
                                    {workflow.name}
                                  </DropdownMenuItem>
                                ))}
                              </ScrollArea>
                            )}
                           <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setIsCreateWorkflowModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                   <DropdownMenuItem className="sm:hidden" onClick={() => setIsShareModalOpen(true)}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </DropdownMenuItem>
                  <DropdownMenuSeparator className="md:hidden"/>
                </DropdownMenuGroup>
                <DropdownMenuItem disabled> 
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : ( 
            // This block is for when user is null AND auth is not loading.
            // Given the new /landing and /auth pages, this specific "Login" button here might become obsolete
            // if AppHeader is strictly for authenticated views.
            // However, if AppHeader could be on a public page, this would be the login trigger.
            // For now, with /auth page, direct link to login is better.
             <Link href="/auth?view=login" passHref>
                <Button size="sm" disabled={authLoading}>
                  <LogInIcon className="mr-2 h-4 w-4" />
                  Login
                </Button>
            </Link>
          )}
        </div>
      </div>
      {isShareModalOpen && user && <ShareWorkflowModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} currentWorkflowName={workflows.find(w => w.id === currentWorkflowId)?.name} />}
      <Dialog open={isCreateWorkflowModalOpen} onOpenChange={setIsCreateWorkflowModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Give your workflow a name and optionally choose a template to get started quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="workflowName" className="mb-1 block text-sm font-medium text-foreground">Workflow Name</Label>
              <Input
                id="workflowName"
                placeholder="e.g., Client Project Alpha, My Content Plan"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                disabled={isCreatingWorkflow}
              />
            </div>
            <div>
              <Label htmlFor="workflowTemplate" className="mb-1 block text-sm font-medium text-foreground">Start with a Template</Label>
               <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isCreatingWorkflow}>
                <SelectTrigger id="workflowTemplate">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {workflowTemplates.map(template => (
                    <SelectItem key={template.value} value={template.value}>
                      <FileText className="mr-2 h-4 w-4 inline-block text-muted-foreground" />
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWorkflowModalOpen(false)} disabled={isCreatingWorkflow}>Cancel</Button>
            <Button onClick={handleCreateWorkflow} disabled={isCreatingWorkflow || !newWorkflowName.trim()}>
              {isCreatingWorkflow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
