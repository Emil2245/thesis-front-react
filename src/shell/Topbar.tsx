import { useLocation } from "react-router-dom";
import { Breadcrumbs } from "./Breadcrumbs";
import { SelectorVersion } from "./SelectorVersion";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const RUTAS_VERSION = ["/apus", "/presupuesto", "/cronograma", "/documentos", "/versiones"];

function necesitaSelectorVersion(pathname: string, proyectoId: string | null): boolean {
  if (!proyectoId) return false;
  const resto = pathname.replace(`/proyectos/${proyectoId}`, "");
  return RUTAS_VERSION.some((r) => resto.startsWith(r));
}

export function Topbar() {
  const { pathname } = useLocation();
  const proyectoId =
    pathname.match(/\/proyectos\/([0-9a-fA-F-]{36})/)?.[1] ?? null;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-vertical:h-4 data-vertical:self-auto"
      />
      <Breadcrumbs />

      {necesitaSelectorVersion(pathname, proyectoId) && (
        <div className="ml-auto flex items-center gap-2">
          <SelectorVersion />
        </div>
      )}
    </header>
  );
}
