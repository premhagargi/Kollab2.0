// src/components/layout/AppSidebar.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Settings, Users, ChevronDown, PlusCircle, HardDrive } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { siteConfig } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { mockWorkspaces, mockBoards, mockUser } from '@/lib/mock-data'; // Using mockUser directly for avatar
import type { Workspace, Board } from '@/types';

interface AppSidebarProps {
  currentWorkspaceId?: string;
  currentBoardId?: string;
  onSelectBoard: (boardId: string) => void; // Callback when a board is selected
}

export function AppSidebar({ currentWorkspaceId = mockWorkspaces[0]?.id, currentBoardId, onSelectBoard }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth(); // Get authenticated user

  const [selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(
    mockWorkspaces.find(ws => ws.id === currentWorkspaceId) || mockWorkspaces[0] || null
  );

  const boardsInWorkspace = selectedWorkspace ? mockBoards.filter(b => b.workspaceId === selectedWorkspace.id) : [];

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">{siteConfig.name}</span>
        </Link>
        <SidebarTrigger className="group-data-[collapsible=icon]:hidden data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent asChild>
        <ScrollArea className="flex-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip="Dashboard"
              >
                <Link href="/">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/analytics'}
                tooltip="Analytics"
              >
                <Link href="/analytics">
                  <BarChart3 />
                  <span>Analytics</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Workspaces</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" tooltip="New Workspace">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </SidebarGroupLabel>
            {/* Workspace Selector - For now, just shows current or first */}
            {selectedWorkspace && (
               <div className="px-2 mb-2">
                <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8">
                  <HardDrive className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{selectedWorkspace.name}</span>
                  {/* <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" /> */}
                </Button>
              </div>
            )}
          </SidebarGroup>
          
          <SidebarGroup>
             <SidebarGroupLabel className="flex items-center justify-between">
              <span>Boards</span>
               <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" tooltip="New Board">
                <PlusCircle className="h-4 w-4" />
              </Button>
            </SidebarGroupLabel>
            <SidebarMenu>
              {boardsInWorkspace.map((board: Board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectBoard(board.id)}
                    isActive={board.id === currentBoardId}
                    tooltip={board.name}
                  >
                    {/* Placeholder for board icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
                    <span>{board.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-2">
        {user && (
           <Link href="/settings" className="w-full">
            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                  <AvatarImage src={mockUser.avatarUrl || undefined} alt={mockUser.name || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{mockUser.name ? mockUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <div className="ml-2 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate">{mockUser.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{mockUser.email}</p>
                </div>
            </Button>
           </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
