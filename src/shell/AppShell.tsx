import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LimiteDeError } from "@/components/comunes/LimiteDeError";
import { DisplayConfigProvider } from "@/contexts/DisplayConfigContext";

export function AppShell() {
  return (
    <DisplayConfigProvider>
      <TooltipProvider>
        <SidebarProvider className="h-svh">
          <AppSidebar />
          <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
            <Topbar />
            <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
              <LimiteDeError>
                <Outlet />
              </LimiteDeError>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </DisplayConfigProvider>
  );
}
