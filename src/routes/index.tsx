import { createBrowserRouter, Navigate } from "react-router-dom";
import { RutaPrivada, RutaAdmin } from "./Guards";
import { AppShell } from "@/shell/AppShell";
import App from "@/App";
import { ErrorPage } from "@/features/errores/pages/ErrorPage";

const lazyPage =
  <TModule extends Record<string, unknown>, TKey extends keyof TModule & string>(
    loader: () => Promise<TModule>,
    name: TKey,
  ) =>
  async () => {
    const mod = await loader();
    return { Component: mod[name] as React.ComponentType };
  };

export const router = createBrowserRouter([
  {
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/proyectos" replace />,
      },
      // ———— Públicas ————
      {
        path: "/login",
        lazy: lazyPage(() => import("@/features/auth/pages/LoginPage"), "LoginPage"),
      },
      {
        path: "/registro",
        lazy: lazyPage(() => import("@/features/auth/pages/RegistroPage"), "RegistroPage"),
      },
      {
        path: "/verificar-email",
        lazy: lazyPage(
          () => import("@/features/auth/pages/VerificarEmailPage"),
          "VerificarEmailPage",
        ),
      },
      {
        path: "/recuperar",
        lazy: lazyPage(() => import("@/features/auth/pages/RecuperarPage"), "RecuperarPage"),
      },
      {
        path: "/restablecer/:token",
        lazy: lazyPage(() => import("@/features/auth/pages/RestablecerPage"), "RestablecerPage"),
      },

      // ———— Autenticadas ————
      {
        element: <RutaPrivada />,
        children: [
          {
            element: <AppShell />,
            children: [
              {
                path: "/proyectos",
                lazy: lazyPage(
                  () => import("@/features/proyectos/pages/ListaProyectosPage"),
                  "ListaProyectosPage",
                ),
              },
              {
                path: "/perfil",
                lazy: lazyPage(() => import("@/features/auth/pages/PerfilPage"), "PerfilPage"),
              },
              {
                path: "/plantillas",
                lazy: lazyPage(
                  () => import("@/features/plantillas/pages/MisPlantillasPage"),
                  "MisPlantillasPage",
                ),
              },
              {
                path: "/plantillas-proyecto",
                lazy: lazyPage(
                  () => import("@/features/plantillas-proyecto/pages/PlantillasProyectoPage"),
                  "PlantillasProyectoPage",
                ),
              },
              {
                path: "/proyectos/:id",
                lazy: lazyPage(
                  () => import("@/features/proyectos/pages/ResumenProyectoPage"),
                  "ResumenProyectoPage",
                ),
              },
              {
                path: "/proyectos/:id/parametros",
                lazy: lazyPage(
                  () => import("@/features/proyectos/pages/ParametrosPage"),
                  "ParametrosPage",
                ),
              },
              {
                path: "/proyectos/:id/insumos",
                lazy: lazyPage(() => import("@/features/insumos/pages/InsumosPage"), "InsumosPage"),
              },
              {
                path: "/proyectos/:id/versiones",
                lazy: lazyPage(
                  () => import("@/features/presupuesto/pages/VersionesPage"),
                  "VersionesPage",
                ),
              },
              {
                path: "/proyectos/:id/apus",
                lazy: lazyPage(
                  () => import("@/features/apu-editor/pages/ListaApusPage"),
                  "ListaApusPage",
                ),
              },
              {
                path: "/proyectos/:id/apus/:apuId",
                lazy: lazyPage(
                  () => import("@/features/apu-editor/pages/EditorApuPage"),
                  "EditorApuPage",
                ),
              },
              {
                path: "/proyectos/:id/presupuesto",
                lazy: lazyPage(
                  () => import("@/features/presupuesto/pages/PresupuestoPage"),
                  "PresupuestoPage",
                ),
              },
              {
                path: "/proyectos/:id/cronograma",
                lazy: lazyPage(
                  () => import("@/features/cronograma/pages/CronogramaPage"),
                  "CronogramaPage",
                ),
              },
              {
                path: "/proyectos/:id/documentos",
                lazy: lazyPage(() => import("@/features/exportar/pages/ExportPage"), "ExportPage"),
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
              {
                path: "/admin/usuarios",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminUsuariosPage"),
                  "AdminUsuariosPage",
                ),
              },
              {
                path: "/admin/bases",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminBasesPage"),
                  "AdminBasesPage",
                ),
              },
              {
                path: "/admin/plantillas",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminPlantillasPage"),
                  "AdminPlantillasPage",
                ),
              },
              {
                path: "/admin/parametros",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminParametrosPage"),
                  "AdminParametrosPage",
                ),
              },
              {
                path: "/admin/valores",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminValoresPage"),
                  "AdminValoresPage",
                ),
              },
              {
                path: "/admin/logs",
                lazy: lazyPage(
                  () => import("@/features/admin/pages/AdminLogsPage"),
                  "AdminLogsPage",
                ),
              },
            ],
          },
        ],
      },

      // ———— Errores ————
      {
        path: "/403",
        lazy: lazyPage(() => import("@/features/errores/pages/SinPermisoPage"), "SinPermisoPage"),
      },
      {
        path: "/404",
        lazy: lazyPage(
          () => import("@/features/errores/pages/NoEncontradaPage"),
          "NoEncontradaPage",
        ),
      },
      {
        path: "*",
        lazy: lazyPage(
          () => import("@/features/errores/pages/NoEncontradaPage"),
          "NoEncontradaPage",
        ),
      },
    ],
  },
]);
