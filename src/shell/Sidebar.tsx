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
import { MODULOS_SIN_BACKEND, type ModuloSinBackend } from "@/lib/disponibilidad";
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
  LayoutTemplateIcon,
  ScrollTextIcon,
  ActivityIcon,
  UserIcon,
} from "lucide-react";

function estaActivo(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

/** Insignia discreta para una entrada de navegación cuyo backend aún no existe. */
function InsigniaPronto() {
  return (
    <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
      pronto
    </span>
  );
}

// `modulo` casa con las claves de MODULOS_SIN_BACKEND (src/lib/disponibilidad.ts):
// única fuente de qué está pendiente. Sin `modulo`, la entrada siempre está activa.
const RUTAS_PROYECTO: {
  sufijo: string;
  icono: typeof LayoutDashboardIcon;
  etiqueta: string;
  modulo?: ModuloSinBackend;
}[] = [
  { sufijo: "", icono: LayoutDashboardIcon, etiqueta: "Resumen" },
  { sufijo: "/insumos", icono: PackageIcon, etiqueta: "Insumos" },
  { sufijo: "/apus", icono: FileTextIcon, etiqueta: "APUs" },
  { sufijo: "/presupuesto", icono: BarChart3Icon, etiqueta: "Presupuesto" },
  { sufijo: "/cronograma", icono: CalendarIcon, etiqueta: "Cronograma" },
  { sufijo: "/documentos", icono: DownloadIcon, etiqueta: "Documentos" },
  { sufijo: "/parametros", icono: SettingsIcon, etiqueta: "Parámetros" },
  { sufijo: "/versiones", icono: GitBranchIcon, etiqueta: "Versiones" },
];

// El gate de admin es por página, no por grupo (plan 050): "Bases" tiene el
// backend completo (`AdminBaseCentralResource`) y "Parámetros" tiene lectura y
// escritura en el recurso de proyectos, así que ninguna de las dos lleva
// `modulo`. Las otras cuatro no tienen un solo endpoint en main.
const RUTAS_ADMIN: {
  ruta: string;
  icono: typeof UsersIcon;
  etiqueta: string;
  modulo?: ModuloSinBackend;
}[] = [
  { ruta: "/admin/usuarios", icono: UsersIcon, etiqueta: "Usuarios", modulo: "admin-usuarios" },
  { ruta: "/admin/bases", icono: DatabaseIcon, etiqueta: "Bases" },
  {
    ruta: "/admin/plantillas",
    icono: BookTemplateIcon,
    etiqueta: "Plantillas",
    modulo: "admin-plantillas",
  },
  { ruta: "/admin/parametros", icono: SettingsIcon, etiqueta: "Parámetros" },
  {
    ruta: "/admin/valores",
    icono: ScrollTextIcon,
    etiqueta: "Valores ref.",
    modulo: "admin-valores",
  },
  { ruta: "/admin/logs", icono: ActivityIcon, etiqueta: "Logs", modulo: "admin-logs" },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const proyectoId = useProyectoActivoId();
  const usuario = useSesionStore((s) => s.usuario);
  const esAdmin = esSuperAdmin(usuario);
  const { data: proyecto } = useProyecto(proyectoId);

  const base = proyectoId ? `/proyectos/${proyectoId}` : null;

  return (
    <Sidebar collapsible="icon">
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
                <SidebarMenuButton
                  asChild
                  isActive={estaActivo(pathname, "/proyectos")}
                  tooltip="Proyectos"
                >
                  <Link to="/proyectos">
                    <FolderIcon />
                    <span>Proyectos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={estaActivo(pathname, "/plantillas")}
                  className={MODULOS_SIN_BACKEND.has("plantillas") ? "opacity-60" : ""}
                  tooltip="Plantillas APU"
                >
                  <Link to="/plantillas">
                    <FileSpreadsheetIcon />
                    <span>Plantillas APU</span>
                    {MODULOS_SIN_BACKEND.has("plantillas") && <InsigniaPronto />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={estaActivo(pathname, "/plantillas-proyecto")}
                  tooltip="Plantillas de proyecto"
                >
                  <Link to="/plantillas-proyecto">
                    <LayoutTemplateIcon />
                    <span>Plantillas de proyecto</span>
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
                  {RUTAS_PROYECTO.map(({ sufijo, icono: Icono, etiqueta, modulo }) => {
                    const ruta = `${base}${sufijo}`;
                    const activo = sufijo === "" ? pathname === base : estaActivo(pathname, ruta);
                    const pendiente = modulo ? MODULOS_SIN_BACKEND.has(modulo) : false;
                    return (
                      <SidebarMenuItem key={etiqueta}>
                        <SidebarMenuButton
                          asChild
                          isActive={activo}
                          className={pendiente ? "opacity-60" : ""}
                          tooltip={etiqueta}
                        >
                          <Link to={ruta}>
                            <Icono />
                            <span>{etiqueta}</span>
                            {pendiente && <InsigniaPronto />}
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
                  {RUTAS_ADMIN.map(({ ruta, icono: Icono, etiqueta, modulo }) => {
                    const pendiente = modulo ? MODULOS_SIN_BACKEND.has(modulo) : false;
                    return (
                      <SidebarMenuItem key={ruta}>
                        <SidebarMenuButton
                          asChild
                          isActive={estaActivo(pathname, ruta)}
                          className={pendiente ? "opacity-60" : ""}
                          tooltip={etiqueta}
                        >
                          <Link to={ruta}>
                            <Icono />
                            <span>{etiqueta}</span>
                            {pendiente && <InsigniaPronto />}
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
