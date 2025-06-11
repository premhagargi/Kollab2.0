
// src/components/layout/AppHeader.tsx
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // For active link styling
import { UserCircle, LogOut, Settings, Users, LogInIcon, Mail, KeyRound, LayoutDashboard, BarChart3, ChevronDown, PlusCircle, Loader2, HardDrive } from 'lucide-react';
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
import { InviteTeamMemberModal } from '@/components/modals/InviteTeamMemberModal';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input'; // For Create Board Modal
import { useAuth } from '@/hooks/useAuth';
import { EmailPasswordLoginForm } from '@/components/auth/EmailPasswordLoginForm';
import { EmailPasswordSignupForm } from '@/components/auth/EmailPasswordSignupForm';
import type { Board } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px" className="mr-2">
    <path fill="#EA4335" d="M24 9.5c3.22 0 5.17.46 6.81 1.37 2.51 1.39 4.2 3.83 4.2 7.13 0 1.4-.33 2.7-.92 3.87L24 24l-8.09-8.09C16.24 14.55 18.67 12.5 24 12.5V9.5z"/>
    <path fill="#4285F4" d="M45.12 24.6c0-1.72-.15-3.36-.42-4.95H24v9.3h11.82c-.52 3.01-2.04 5.55-4.58 7.28l6.91 5.34c4.04-3.73 6.37-9.19 6.37-15.97z"/>
    <path fill="#FBBC05" d="M10.34 28.16l-7.49 5.79C1.04 30.96 0 27.62 0 24s1.04-6.96 2.85-9.95l7.49 5.79c-.4.99-.64 2.08-.64 3.16s.24 2.17.64 3.16z"/>
    <path fill="#34A853" d="M24 48c6.42 0 11.88-2.11 15.84-5.72l-6.91-5.34c-2.13 1.43-4.86 2.28-7.93 2.28-6.08 0-11.24-4.08-13.09-9.59L2.85 33.95C6.79 42.56 14.73 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

interface AppHeaderProps {
  boards: Board[];
  currentBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
  onBoardCreated: (newBoardName: string) => Promise<string | null>;
  isLoadingBoards: boolean;
}

export function AppHeader({ boards, currentBoardId, onSelectBoard, onBoardCreated, isLoadingBoards }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, loginWithGoogle, logout, loading: authLoading } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [authView, setAuthView] = useState<'google' | 'emailLogin' | 'emailSignup'>('google');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCreateBoardModalOpen, setIsCreateBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false); 
    setAuthView('google'); 
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setIsCreatingBoard(true);
    const newBoardId = await onBoardCreated(newBoardName);
    if (newBoardId) {
      setNewBoardName('');
      setIsCreateBoardModalOpen(false);
    }
    setIsCreatingBoard(false);
  };

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
          
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant={pathname === '/' ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
              </Button>
              <Button variant={pathname === '/analytics' ? "secondary" : "ghost"} size="sm" asChild>
                <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <HardDrive className="mr-2 h-4 w-4" /> Boards <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Your Boards</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingBoards ? (
                    <DropdownMenuItem disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                    </DropdownMenuItem>
                  ) : boards.length === 0 ? (
                    <DropdownMenuItem disabled>No boards yet.</DropdownMenuItem>
                  ) : (
                    <ScrollArea className="max-h-60">
                      {boards.map(board => (
                        <DropdownMenuItem 
                          key={board.id} 
                          onClick={() => onSelectBoard(board.id)}
                          className={cn(currentBoardId === board.id && "bg-accent text-accent-foreground")}
                        >
                          {board.name}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsCreateBoardModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Board...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          )}
        </div>

        <div className="flex-grow" />

        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {authLoading && !user ? ( 
            <div className="h-9 w-24 animate-pulse rounded-md bg-muted"></div>
          ) : user ? (
            <>
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(true)} disabled={authLoading} size="sm" className="hidden sm:inline-flex">
              <Users className="mr-2 h-4 w-4" /> Invite Team
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
                <DropdownMenuGroup className="md:hidden">
                   <DropdownMenuItem asChild>
                     <Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                   </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                     <Link href="/analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link>
                   </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger><HardDrive className="mr-2 h-4 w-4" />Boards</DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent className="w-48">
                          <DropdownMenuLabel>Your Boards</DropdownMenuLabel>
                           <DropdownMenuSeparator />
                            {isLoadingBoards ? (
                              <DropdownMenuItem disabled>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                              </DropdownMenuItem>
                            ) : boards.length === 0 ? (
                              <DropdownMenuItem disabled>No boards yet.</DropdownMenuItem>
                            ) : (
                               <ScrollArea className="max-h-48">
                                {boards.map(board => (
                                  <DropdownMenuItem key={board.id} onClick={() => onSelectBoard(board.id)}
                                   className={cn(currentBoardId === board.id && "bg-accent text-accent-foreground")}>
                                    {board.name}
                                  </DropdownMenuItem>
                                ))}
                              </ScrollArea>
                            )}
                           <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setIsCreateBoardModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create New
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                   <DropdownMenuItem className="sm:hidden" onClick={() => setIsInviteModalOpen(true)}>
                        <Users className="mr-2 h-4 w-4" /> Invite Team
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
            <Dialog open={isLoginModalOpen} onOpenChange={(open) => { setIsLoginModalOpen(open); if (!open) setAuthView('google'); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { setIsLoginModalOpen(true); setAuthView('google'); }} disabled={authLoading} size="sm">
                  <LogInIcon className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-center text-2xl font-semibold">
                    {authView === 'emailLogin' && 'Login to Kollab'}
                    {authView === 'emailSignup' && 'Create your Kollab Account'}
                    {authView === 'google' && `Welcome to ${siteConfig.name}`}
                  </DialogTitle>
                  <DialogDescription className="text-center">
                    {authView === 'emailLogin' && 'Enter your email and password to access your account.'}
                    {authView === 'emailSignup' && 'Get started by creating a new account.'}
                    {authView === 'google' && 'Choose your preferred sign-in method.'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-6 px-2 space-y-6">
                  {authView === 'google' && (
                    <>
                      <Button onClick={async () => { await loginWithGoogle(); handleLoginSuccess();}} className="w-full" disabled={authLoading}>
                        <GoogleIcon /> Sign in with Google
                      </Button>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-popover px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setAuthView('emailLogin')} className="w-full" disabled={authLoading}>
                        <Mail className="mr-2 h-4 w-4" /> Sign in with Email
                      </Button>
                       <p className="text-center text-sm text-muted-foreground">
                          Don't have an account?{' '}
                          <Button variant="link" type="button" onClick={() => setAuthView('emailSignup')} className="p-0 h-auto font-semibold text-primary" disabled={authLoading}>
                            Sign Up
                          </Button>
                        </p>
                    </>
                  )}

                  {authView === 'emailLogin' && (
                    <EmailPasswordLoginForm 
                      onSuccess={handleLoginSuccess} 
                      onSwitchToSignup={() => setAuthView('emailSignup')} 
                    />
                  )}

                  {authView === 'emailSignup' && (
                    <EmailPasswordSignupForm 
                      onSuccess={handleLoginSuccess} 
                      onSwitchToLogin={() => setAuthView('emailLogin')}
                    />
                  )}
                </div>
                { (authView === 'emailLogin' || authView === 'emailSignup') &&
                  <DialogFooter className="pt-4 border-t">
                     <Button variant="ghost" onClick={() => setAuthView('google')} className="w-full text-sm" disabled={authLoading}>
                      &larr; Back to all login options
                    </Button>
                  </DialogFooter>
                }
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {isInviteModalOpen && user && <InviteTeamMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />}
      <Dialog open={isCreateBoardModalOpen} onOpenChange={setIsCreateBoardModalOpen}>
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
    </header>
  );
}
    
