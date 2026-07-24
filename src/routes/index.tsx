import { createBrowserRouter } from "react-router-dom";
import { RutaPrivada, RutaAdmin } from "./Guards";
import { AppShell } from "@/shell/AppShell";
import App from "@/App";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegistroPage } from "@/features/auth/pages/RegistroPage";
import { VerificarEmailPage } from "@/features/auth/pages/VerificarEmailPage";
import { RecuperarPage } from "@/features/auth/pages/RecuperarPage";
import { RestablecerPage } from "@/features/auth/pages/RestablecerPage";
import { PerfilPage } from "@/features/auth/pages/PerfilPage";
import { ListaProyectosPage } from "@/features/proyectos/pages/ListaProyectosPage";
import { ResumenProyectoPage } from "@/features/proyectos/pages/ResumenProyectoPage";
import { ParametrosPage } from "@/features/proyectos/pages/ParametrosPage";
import { NoEncontradaPage } from "@/features/errores/pages/NoEncontradaPage";
import { SinPermisoPage } from "@/features/errores/pages/SinPermisoPage";
import { ErrorPage } from "@/features/errores/pages/ErrorPage";
import { InsumosPage } from "@/features/insumos/pages/InsumosPage";
import { ListaApusPage } from "@/features/apu-editor/pages/ListaApusPage";
import { EditorApuPage } from "@/features/apu-editor/pages/EditorApuPage";
import { MisPlantillasPage } from "@/features/plantillas/pages/MisPlantillasPage";
import { PresupuestoPage } from "@/features/presupuesto/pages/PresupuestoPage";
import { VersionesPage } from "@/features/presupuesto/pages/VersionesPage";
import { CronogramaPage } from "@/features/cronograma/pages/CronogramaPage";
import { ExportPage } from "@/features/exportar/pages/ExportPage";
import { AdminUsuariosPage } from "@/features/admin/pages/AdminUsuariosPage";
import { AdminBasesPage } from "@/features/admin/pages/AdminBasesPage";
import { AdminPlantillasPage } from "@/features/admin/pages/AdminPlantillasPage";
import { AdminParametrosPage } from "@/features/admin/pages/AdminParametrosPage";
import { AdminValoresPage } from "@/features/admin/pages/AdminValoresPage";
import { AdminLogsPage } from "@/features/admin/pages/AdminLogsPage";

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      // ———— Públicas ————
      { path: "/login", element: <LoginPage /> },
      { path: "/registro", element: <RegistroPage /> },
      { path: "/verificar-email", element: <VerificarEmailPage /> },
      { path: "/recuperar", element: <RecuperarPage /> },
      { path: "/restablecer/:token", element: <RestablecerPage /> },

      // ———— Autenticadas ————
      {
        element: <RutaPrivada />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/proyectos", element: <ListaProyectosPage /> },
              { path: "/perfil", element: <PerfilPage /> },
              { path: "/plantillas", element: <MisPlantillasPage /> },
              { path: "/proyectos/:id", element: <ResumenProyectoPage /> },
              {
                path: "/proyectos/:id/parametros",
                element: <ParametrosPage />,
              },
              {
                path: "/proyectos/:id/insumos",
                element: <InsumosPage />,
              },
              {
                path: "/proyectos/:id/versiones",
                element: <VersionesPage />,
              },
              {
                path: "/proyectos/:id/apus",
                element: <ListaApusPage />,
              },
              {
                path: "/proyectos/:id/apus/:apuId",
                element: <EditorApuPage />,
              },
              {
                path: "/proyectos/:id/presupuesto",
                element: <PresupuestoPage />,
              },
              {
                path: "/proyectos/:id/cronograma",
                element: <CronogramaPage />,
              },
              {
                path: "/proyectos/:id/documentos",
                element: <ExportPage />,
              },
            ],
          },
        ],
      },

      // ———— Super-Admin ————
      {
        element: <RutaAdmin />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/admin/usuarios", element: <AdminUsuariosPage /> },
              { path: "/admin/bases", element: <AdminBasesPage /> },
              { path: "/admin/plantillas", element: <AdminPlantillasPage /> },
              { path: "/admin/parametros", element: <AdminParametrosPage /> },
              { path: "/admin/valores", element: <AdminValoresPage /> },
              { path: "/admin/logs", element: <AdminLogsPage /> },
            ],
          },
        ],
      },

      // ———— Errores ————
      { path: "/403", element: <SinPermisoPage /> },
      { path: "/404", element: <NoEncontradaPage /> },
      { path: "*", element: <NoEncontradaPage /> },
    ],
  },
]);
