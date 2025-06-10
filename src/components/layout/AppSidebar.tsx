
// src/components/layout/AppSidebar.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, Settings, Users, ChevronDown, PlusCircle, HardDrive, Loader2 } from 'lucide-react';
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
import type { Workspace, Board as BoardType } from '@/types'; // Renamed Board to BoardType to avoid conflict
import { getBoardsByOwner, createBoard } from '@/services/boardService';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';


interface AppSidebarProps {
  currentBoardId: string | null; // Changed from optional to required or null
  onSelectBoard: (boardId: string) => void;
  onBoardCreated: (newBoardId: string) => void; // Callback when a new board is created
}

export function AppSidebar({ currentBoardId, onSelectBoard, onBoardCreated }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();

  const [userBoards, setUserBoards] = useState<BoardType[]>([]);
  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // Mock workspace for now, can be expanded later
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(
    { id: 'ws-user-default', name: 'My Workspace', ownerId: user?.id || 'unknown' }
  );

  useEffect(() => {
    if (user) {
      setIsLoadingBoards(true);
      getBoardsByOwner(user.id)
        .then(boards => {
          setUserBoards(boards);
          if (boards.length > 0 && !currentBoardId) {
            // If no board is selected, select the first one by default
            // This might be handled by the page itself now
          }
        })
        .catch(error => {
          console.error("Error fetching boards:", error);
          toast({ title: "Error", description: "Could not load your boards.", variant: "destructive" });
        })
        .finally(() => setIsLoadingBoards(false));
    } else {
      setUserBoards([]); // Clear boards if user logs out
    }
  }, [user, toast]);

  const handleCreateBoard = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to create a board.", variant: "destructive" });
      return;
    }
    if (!newBoardName.trim()) {
      toast({ title: "Validation Error", description: "Board name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsCreatingBoard(true);
    try {
      const newBoard = await createBoard(user.id, newBoardName.trim());
      setUserBoards(prevBoards => [...prevBoards, newBoard]);
      toast({ title: "Board Created", description: `Board "${newBoard.name}" has been created.` });
      setIsCreateBoardModalOpen(false);
      setNewBoardName('');
      onBoardCreated(newBoard.id); // Notify parent to select the new board
    } catch (error) {
      console.error("Error creating board:", error);
      toast({ title: "Error", description: "Failed to create board.", variant: "destructive" });
    } finally {
      setIsCreatingBoard(false);
    }
  };


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
              <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
                <Link href="/"><LayoutDashboard /><span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/analytics'} tooltip="Analytics">
                <Link href="/analytics"><BarChart3 /><span>Analytics</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator />

          {user && selectedWorkspace && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>Workspace</span>
                </SidebarGroupLabel>
                <div className="px-2 mb-2">
                  <Button variant="outline" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8">
                    <HardDrive className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{selectedWorkspace.name}</span>
                  </Button>
                </div>
              </SidebarGroup>
            
              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center justify-between">
                  <span>Boards</span>
                  <Dialog open={isCreateBoardModalOpen} onOpenChange={setIsCreateBoardModalOpen}>
                    <DialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6 group-data-[collapsible=icon]:hidden" tooltip="New Board">
                          <PlusCircle className="h-4 w-4" />
                       </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Board</DialogTitle>
                        <DialogDescription>Enter a name for your new board.</DialogDescription>
                      </DialogHeader>
                      <Input
                        placeholder="Board Name"
                        value={newBoardName}
                        onChange={(e) => setNewBoardName(e.target.value)}
                        className="my-4"
                        disabled={isCreatingBoard}
                      />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateBoardModalOpen(false)} disabled={isCreatingBoard}>Cancel</Button>
                        <Button onClick={handleCreateBoard} disabled={isCreatingBoard || !newBoardName.trim()}>
                          {isCreatingBoard && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Board
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </SidebarGroupLabel>
                <SidebarMenu>
                  {isLoadingBoards && (
                    <div className="p-2 group-data-[collapsible=icon]:hidden">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="sr-only">Loading boards...</span>
                    </div>
                  )}
                  {!isLoadingBoards && userBoards.length === 0 && (
                     <p className="px-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">No boards yet. Create one!</p>
                  )}
                  {userBoards.map((board: BoardType) => (
                    <SidebarMenuItem key={board.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectBoard(board.id)}
                        isActive={board.id === currentBoardId}
                        tooltip={board.name}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18M12 3v18"/></svg>
                        <span>{board.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </>
          )}
        </ScrollArea>
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter className="p-2">
        {user && (
           <Link href="/settings" className="w-full">
            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center">
                <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint="user avatar" />
                  <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <div className="ml-2 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
            </Button>
           </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
