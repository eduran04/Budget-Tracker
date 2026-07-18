import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";

/** Suspense fallback while a lazily loaded page chunk is fetched. */
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

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
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <MobileNav />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
