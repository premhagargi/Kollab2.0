// src/components/layout/AppHeader.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import { Menu, UserCircle, LogIn, LogOut, Settings, Users, LogInIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSidebar } from '@/components/ui/sidebar';
import { siteConfig } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { InviteTeamMemberModal } from '@/components/modals/InviteTeamMemberModal';


export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const { user, login, logout, loading } = useAuth(); // login is now loginWithGoogle via useAuth hook
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link href="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span className="font-bold font-headline text-xl">{siteConfig.name}</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-md bg-muted"></div>
            ) : user ? (
              <>
              <Button variant="ghost" onClick={() => setIsInviteModalOpen(true)}>
                <Users className="mr-2 h-4 w-4" /> Invite Team
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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
                  <DropdownMenuItem>
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
              <Button onClick={login}> {/* This will call loginWithGoogle */}
                <LogInIcon className="mr-2 h-4 w-4" /> {/* Changed to LogInIcon for better visual */}
                Login with Google
              </Button>
            )}
          </nav>
        </div>
      </div>
      {isInviteModalOpen && <InviteTeamMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />}
    </header>
  );
}
