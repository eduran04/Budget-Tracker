import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="hidden h-12 items-center gap-2 border-b px-4 md:flex">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-4" />
          <span className="text-sm text-muted-foreground">Budget Tracker</span>
        </div>
        <div className="mx-auto max-w-6xl p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <MobileNav />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
