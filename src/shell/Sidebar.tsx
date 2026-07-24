import { Link, useLocation } from "react-router-dom";
import { useSesionStore, esSuperAdmin } from "@/features/auth/sesion";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useProyectoActivoId } from "./contexto";
import {
  CalculatorIcon,
  FolderIcon,
  UsersIcon,
  FileTextIcon,
  BarChart3Icon,
  CalendarIcon,
  DownloadIcon,
  SettingsIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  PackageIcon,
  FileSpreadsheetIcon,
  DatabaseIcon,
  BookTemplateIcon,
  ScrollTextIcon,
  ActivityIcon,
} from "lucide-react";

function estaActivo(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

export function AppSidebar() {
  const { pathname } = useLocation();
  const proyectoId = useProyectoActivoId();
  const usuario = useSesionStore((s) => s.usuario);
  const esAdmin = esSuperAdmin(usuario);

  const base = proyectoId ? `/proyectos/${proyectoId}` : null;

  return (
    <>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/proyectos">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalculatorIcon className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">APU</span>
                  <span className="text-xs text-muted-foreground">Sistema de presupuestos</span>
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
              <SidebarGroupLabel>Proyecto</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, base)}>
                      <Link to={base}>
                        <LayoutDashboardIcon />
                        <span>Resumen</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, `${base}/insumos`)}>
                      <Link to={`${base}/insumos`}>
                        <PackageIcon />
                        <span>Insumos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, `${base}/apus`)}>
                      <Link to={`${base}/apus`}>
                        <FileTextIcon />
                        <span>APUs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={estaActivo(pathname, `${base}/presupuesto`)}
                    >
                      <Link to={`${base}/presupuesto`}>
                        <BarChart3Icon />
                        <span>Presupuesto</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={estaActivo(pathname, `${base}/cronograma`)}
                    >
                      <Link to={`${base}/cronograma`}>
                        <CalendarIcon />
                        <span>Cronograma</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={estaActivo(pathname, `${base}/documentos`)}
                    >
                      <Link to={`${base}/documentos`}>
                        <DownloadIcon />
                        <span>Documentos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={estaActivo(pathname, `${base}/parametros`)}
                    >
                      <Link to={`${base}/parametros`}>
                        <SettingsIcon />
                        <span>Parámetros</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, `${base}/versiones`)}>
                      <Link to={`${base}/versiones`}>
                        <GitBranchIcon />
                        <span>Versiones</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/usuarios")}>
                      <Link to="/admin/usuarios">
                        <UsersIcon />
                        <span>Usuarios</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/bases")}>
                      <Link to="/admin/bases">
                        <DatabaseIcon />
                        <span>Bases</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/plantillas")}>
                      <Link to="/admin/plantillas">
                        <BookTemplateIcon />
                        <span>Plantillas</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/parametros")}>
                      <Link to="/admin/parametros">
                        <SettingsIcon />
                        <span>Parámetros</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/valores")}>
                      <Link to="/admin/valores">
                        <ScrollTextIcon />
                        <span>Valores ref.</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={estaActivo(pathname, "/admin/logs")}>
                      <Link to="/admin/logs">
                        <ActivityIcon />
                        <span>Logs</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={estaActivo(pathname, "/perfil")}>
              <Link to="/perfil">
                <UsersIcon />
                <span>Perfil</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
