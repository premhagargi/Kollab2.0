
// src/components/layout/BottomNavigationBar.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutGrid, CalendarDays, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationBarProps {
    onToggleCalendar: () => void;
    isCalendarVisible: boolean;
}

export function BottomNavigationBar({ onToggleCalendar, isCalendarVisible }: BottomNavigationBarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Board', icon: LayoutGrid, isActive: pathname === '/' && !isCalendarVisible },
    { 
      label: 'Calendar', 
      icon: CalendarDays, 
      onClick: onToggleCalendar, 
      isActive: pathname === '/' && isCalendarVisible 
    },
    { href: '/analytics', label: 'Insights', icon: BarChart3, isActive: pathname === '/analytics' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background shadow-top md:hidden">
      {navItems.map((item) => (
        item.href ? (
          <Link key={item.label} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center h-full w-full rounded-none text-xs p-1",
                item.isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={item.isActive ? "page" : undefined}
            >
              <item.icon className={cn("h-5 w-5 mb-0.5", item.isActive && "text-primary fill-primary/10")} />
              {item.label}
            </Button>
          </Link>
        ) : (
          <Button
            key={item.label}
            variant="ghost"
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center justify-center h-full w-full rounded-none text-xs p-1",
              item.isActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-pressed={item.isActive}
          >
            <item.icon className={cn("h-5 w-5 mb-0.5", item.isActive && "text-primary fill-primary/10")} />
            {item.label}
          </Button>
        )
      ))}
    </nav>
  );
}

