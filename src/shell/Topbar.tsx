import { useNavigate } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { useCerrarSesion } from "@/features/auth/hooks/useAuthMutaciones";
import { Breadcrumbs } from "./Breadcrumbs";
import { SelectorProyecto } from "./SelectorProyecto";
import { SelectorVersion } from "./SelectorVersion";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "react-router-dom";

const RUTAS_VERSION = ["/apus", "/presupuesto", "/cronograma", "/documentos", "/versiones"];

function necesitaSelectorVersion(pathname: string, proyectoId: number | null): boolean {
  if (!proyectoId) return false;
  const resto = pathname.replace(`/proyectos/${proyectoId}`, "");
  return RUTAS_VERSION.some((r) => resto.startsWith(r));
}

export function Topbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const usuario = useSesionStore((s) => s.usuario);
  const cerrarSesion = useCerrarSesion();
  const proyectoId = pathname.match(/\/proyectos\/(\d+)/)?.[1]
    ? Number(pathname.match(/\/proyectos\/(\d+)/)?.[1])
    : null;

  const inicial = usuario?.nombre?.charAt(0).toUpperCase() ?? "?";

  return (
    <header className="flex h-12 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <SelectorProyecto />
        {necesitaSelectorVersion(pathname, proyectoId) && <SelectorVersion />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="outline-none" aria-label="Menú de usuario">
              <Avatar className="size-8 cursor-pointer">
                <AvatarFallback>{inicial}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{usuario?.nombre}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/perfil")}>Perfil</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => cerrarSesion.mutate()}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
