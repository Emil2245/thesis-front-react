import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSesionStore, esSuperAdmin } from "@/features/auth/sesion";
import { useCerrarSesion } from "@/features/auth/hooks/useAuthMutaciones";
import { useProyecto } from "@/features/proyectos/hooks/useProyectos";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProyectoActivoId } from "./contexto";
import {
  CalculatorIcon,
  ChevronsUpDownIcon,
  FolderIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
  CalendarIcon,
  DownloadIcon,
  SettingsIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PackageIcon,
  FileSpreadsheetIcon,
  DatabaseIcon,
  BookTemplateIcon,
  ScrollTextIcon,
  ActivityIcon,
  UserIcon,
} from "lucide-react";

function estaActivo(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

const RUTAS_PROYECTO = [
  { sufijo: "", icono: LayoutDashboardIcon, etiqueta: "Resumen" },
  { sufijo: "/insumos", icono: PackageIcon, etiqueta: "Insumos" },
  { sufijo: "/apus", icono: FileTextIcon, etiqueta: "APUs" },
  { sufijo: "/presupuesto", icono: BarChart3Icon, etiqueta: "Presupuesto" },
  { sufijo: "/cronograma", icono: CalendarIcon, etiqueta: "Cronograma" },
  { sufijo: "/documentos", icono: DownloadIcon, etiqueta: "Documentos" },
  { sufijo: "/parametros", icono: SettingsIcon, etiqueta: "Parámetros" },
  { sufijo: "/versiones", icono: GitBranchIcon, etiqueta: "Versiones" },
] as const;

const RUTAS_ADMIN = [
  { ruta: "/admin/usuarios", icono: UsersIcon, etiqueta: "Usuarios" },
  { ruta: "/admin/bases", icono: DatabaseIcon, etiqueta: "Bases" },
  { ruta: "/admin/plantillas", icono: BookTemplateIcon, etiqueta: "Plantillas" },
  { ruta: "/admin/parametros", icono: SettingsIcon, etiqueta: "Parámetros" },
  { ruta: "/admin/valores", icono: ScrollTextIcon, etiqueta: "Valores ref." },
  { ruta: "/admin/logs", icono: ActivityIcon, etiqueta: "Logs" },
] as const;

export function AppSidebar() {
  const { pathname } = useLocation();
  const proyectoId = useProyectoActivoId();
  const usuario = useSesionStore((s) => s.usuario);
  const esAdmin = esSuperAdmin(usuario);
  const { data: proyecto } = useProyecto(proyectoId);

  const base = proyectoId ? `/proyectos/${proyectoId}` : null;

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/proyectos">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CalculatorIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Sistema APU</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Presupuestos de obra
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={estaActivo(pathname, "/proyectos")}>
                  <Link to="/proyectos">
                    <FolderIcon />
                    <span>Proyectos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={estaActivo(pathname, "/plantillas")}>
                  <Link to="/plantillas">
                    <FileSpreadsheetIcon />
                    <span>Plantillas APU</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {base && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel title={proyecto?.nombreProyecto}>
                {proyecto?.nombreProyecto ?? "Proyecto"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {RUTAS_PROYECTO.map(({ sufijo, icono: Icono, etiqueta }) => {
                    const ruta = `${base}${sufijo}`;
                    const activo = sufijo === "" ? pathname === base : estaActivo(pathname, ruta);
                    return (
                      <SidebarMenuItem key={etiqueta}>
                        <SidebarMenuButton asChild isActive={activo}>
                          <Link to={ruta}>
                            <Icono />
                            <span>{etiqueta}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {esAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administración</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {RUTAS_ADMIN.map(({ ruta, icono: Icono, etiqueta }) => (
                    <SidebarMenuItem key={ruta}>
                      <SidebarMenuButton asChild isActive={estaActivo(pathname, ruta)}>
                        <Link to={ruta}>
                          <Icono />
                          <span>{etiqueta}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <MenuUsuario />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function MenuUsuario() {
  const navigate = useNavigate();
  const usuario = useSesionStore((s) => s.usuario);
  const cerrarSesion = useCerrarSesion();
  const inicial = usuario?.nombre?.charAt(0).toUpperCase() ?? "?";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label="Menú de usuario">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{inicial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{usuario?.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{usuario?.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid text-left text-sm leading-tight">
                <span className="truncate font-medium">{usuario?.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{usuario?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <UserIcon />
                Perfil
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => cerrarSesion.mutate()}>
              <LogOutIcon />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
