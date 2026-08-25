import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LimiteDeError } from "@/components/comunes/LimiteDeError";

export function AppShell() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <Topbar />
          <main className="flex flex-1 flex-col gap-5 p-6">
            <LimiteDeError>
              <Outlet />
            </LimiteDeError>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
