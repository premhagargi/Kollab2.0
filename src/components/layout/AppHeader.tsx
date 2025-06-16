
// src/components/layout/AppHeader.tsx
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, LogOut, Settings, LogInIcon, LayoutDashboard, BarChart3, ChevronDown, PlusCircle, Loader2, HardDrive, Menu } from 'lucide-react'; // Removed CalendarDays, Share2, FileText
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'; // Removed SheetClose
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { siteConfig } from '@/config/site';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'; // Removed DialogTrigger
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import type { Workflow } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton';
import { Separator } from '../ui/separator';
import { FileText } from 'lucide-react'; // Added FileText back for templates

interface AppHeaderProps {
  workflows: Workflow[];
  currentWorkflowId: string | null;
  onSelectWorkflow: (workflowId: string) => void;
  onWorkflowCreated: (newWorkflowName: string, templateName?: string) => Promise<string | null>;
  isLoadingWorkflows: boolean;
}

const workflowTemplates = [
  { value: "Blank Workflow", label: "Blank Workflow" },
  { value: "Freelance Project", label: "Freelance Project" },
  { value: "Content Creation", label: "Content Creation" },
  { value: "Social Media Content Calendar", label: "Social Media Content Calendar" },
  { value: "Weekly Solo Sprint", label: "Weekly Solo Sprint" },
];

export function AppHeader({ workflows, currentWorkflowId, onSelectWorkflow, onWorkflowCreated, isLoadingWorkflows }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, logout, loading: authLoading } = useAuth();
  const [isCreateWorkflowModalOpen, setIsCreateWorkflowModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(workflowTemplates[0].value);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    setIsCreatingWorkflow(true);
    const newWorkflowId = await onWorkflowCreated(newWorkflowName, selectedTemplate);
    if (newWorkflowId) {
      setNewWorkflowName('');
      setSelectedTemplate(workflowTemplates[0].value);
      setIsCreateWorkflowModalOpen(false);
      setIsMobileMenuOpen(false);
    }
    setIsCreatingWorkflow(false);
  };

  if (!user && !authLoading && pathname !== '/landing' && pathname !== '/auth') {
     return null;
  }

  const commonUserActions = (
    <>
      <DropdownMenuItem disabled>
        <Settings className="mr-2 h-4 w-4" />
        <span>Settings</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
        <LogOut className="mr-2 h-4 w-4" />
        <span>Log out</span>
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-16 flex-shrink-0 border-b">
        <div className="container mx-auto flex h-full items-center px-2 sm:px-4">
          {user && (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden mr-2">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="p-4 border-b">
                   <SheetTitle className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                    <span>{siteConfig.name}</span>
                   </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-140px)]"> {/* Adjusted height for SheetFooter */}
                  <nav className="flex flex-col space-y-1 p-4">
                    <Button variant={pathname === '/' ? "secondary" : "ghost"} className="justify-start" size="sm" asChild onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                    </Button>
                    <Button variant={pathname === '/analytics' ? "secondary" : "ghost"} className="justify-start" size="sm" asChild onClick={() => setIsMobileMenuOpen(false)}>
                      <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />My Insights</Link>
                    </Button>
                    <Separator className="my-2" />
                    <h3 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Workflows</h3>
                    {isLoadingWorkflows ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : workflows.length === 0 ? (
                       <div className="px-2 py-1.5 text-sm text-muted-foreground">No workflows yet.</div>
                    ) : (
                      <ScrollArea className="max-h-48">
                        {workflows.map(workflow => (
                          <Button
                            key={workflow.id}
                            variant={currentWorkflowId === workflow.id ? "secondary" : "ghost"}
                            size="sm"
                            className="w-full justify-start truncate"
                            onClick={() => { onSelectWorkflow(workflow.id); setIsMobileMenuOpen(false);}}
                          >
                            {workflow.name}
                          </Button>
                        ))}
                      </ScrollArea>
                    )}
                     <Button variant="outline" size="sm" className="mt-2 justify-start" onClick={() => { setIsCreateWorkflowModalOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New Workflow
                    </Button>
                  </nav>
                </ScrollArea>
                 <div className="p-4 border-t absolute bottom-0 w-full bg-background">
                   <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                     <LogOut className="mr-2 h-4 w-4" /> Log out
                   </Button>
                 </div>
              </SheetContent>
            </Sheet>
          )}

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="font-bold font-headline text-xl hidden sm:inline">{siteConfig.name}</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-1">
                <Button variant={pathname === '/' ? "secondary" : "ghost"} size="sm" asChild>
                  <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                </Button>
                <Button variant={pathname === '/analytics' ? "secondary" : "ghost"} size="sm" asChild>
                  <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />My Insights</Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="min-w-[120px] justify-start">
                      <HardDrive className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{workflows.find(w => w.id === currentWorkflowId)?.name || "Workflows"}</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
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
                            className={cn("truncate",currentWorkflowId === workflow.id && "bg-accent text-accent-foreground")}
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

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <ThemeToggleButton />
            {authLoading && !user ? (
              <div className="h-9 w-20 sm:w-24 animate-pulse rounded-md bg-muted"></div>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="hidden md:inline-flex">
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full" disabled={authLoading}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="user avatar"/>
                      <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 hidden md:block" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {commonUserActions}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
               <Link href="/auth?view=login" passHref>
                  <Button size="sm" disabled={authLoading}>
                    <LogInIcon className="mr-2 h-4 w-4" />
                    Login
                  </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <Dialog open={isCreateWorkflowModalOpen} onOpenChange={setIsCreateWorkflowModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Give your workflow a name and optionally choose a template to get started quickly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="workflowNameModal" className="mb-1 block text-sm font-medium text-foreground">Workflow Name</Label>
              <Input
                id="workflowNameModal"
                placeholder="e.g., Client Project Alpha, My Content Plan"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                disabled={isCreatingWorkflow}
              />
            </div>
            <div>
              <Label htmlFor="workflowTemplateModal" className="mb-1 block text-sm font-medium text-foreground">Start with a Template</Label>
               <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={isCreatingWorkflow}>
                <SelectTrigger id="workflowTemplateModal">
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
    </>
  );
}
