
// src/components/ui/sidebar.tsx
// This file contained UI primitives for a generic sidebar.
// As the specific AppSidebar has been removed and its functionality integrated into AppHeader,
// these primitives are not directly used in the current main layout.
// Clearing content to reflect this. It can be repopulated or deleted if a generic sidebar is not needed elsewhere.

"use client";
import React from 'react';

// console.warn("Sidebar UI primitives (sidebar.tsx) are currently unused as AppSidebar has been removed. This file can be deleted or repurposed if a generic sidebar component is needed later.");

export const useSidebar = () => {
  // Mock implementation as the provider is removed
  return {
    state: "expanded",
    open: true,
    setOpen: () => {},
    openMobile: false,
    setOpenMobile: () => {},
    isMobile: false,
    toggleSidebar: () => {},
  };
};

// You can keep or remove the other exports (Sidebar, SidebarTrigger, etc.)
// For now, I'll leave them commented out or minimal to avoid breaking imports if any utility was used elsewhere,
// though it's unlikely for this specific component set.

/*
export const SidebarProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Sidebar = ({ children }: { children: React.ReactNode }) => <div data-testid="mock-sidebar">{children}</div>;
export const SidebarHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarFooter = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarMenu = ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>;
export const SidebarMenuItem = ({ children }: { children: React.ReactNode }) => <li>{children}</li>;
export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
  <button ref={ref} {...props} />
));
SidebarMenuButton.displayName = "SidebarMenuButton";
export const SidebarGroup = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarGroupLabel = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
export const SidebarSeparator = () => <hr />;
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>((props, ref) => (
  <button ref={ref} {...props} />
));
SidebarTrigger.displayName = "SidebarTrigger";
*/

// Minimal export to satisfy potential imports if any exist, though they should be removed.
export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
    