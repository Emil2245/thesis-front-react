import { describe, expect, it } from "vitest";
import { router } from "@/routes/index";

type RouteHandle = { path?: string; element?: unknown; children?: RouteHandle[] };

function rutasDe(nodos: RouteHandle[], prefix = ""): string[] {
  return nodos.flatMap((n) => {
    const full = n.path ? `${prefix}/${n.path}`.replace(/\/+/g, "/") : prefix;
    const self = full || "/";
    return [self, ...rutasDe(n.children ?? [], full)];
  });
}

describe("rutas del mapa §3", () => {
  const esperadas = [
    "/login",
    "/registro",
    "/verificar-email",
    "/recuperar",
    "/restablecer/:token",
    "/proyectos",
    "/perfil",
    "/plantillas",
    "/proyectos/:id",
    "/proyectos/:id/workspace",
    "/proyectos/:id/parametros",
    "/proyectos/:id/insumos",
    "/proyectos/:id/versiones",
    "/proyectos/:id/apus",
    "/proyectos/:id/apus/:apuId",
    "/proyectos/:id/presupuesto",
    "/proyectos/:id/cronograma",
    "/proyectos/:id/documentos",
    "/admin/usuarios",
    "/admin/bases",
    "/admin/plantillas",
    "/admin/parametros",
    "/admin/valores",
    "/admin/logs",
    "/403",
    "/404",
  ];

  it("contiene todas las rutas del mapa §3", () => {
    const encontradas = rutasDe(router.routes as RouteHandle[]);
    for (const ruta of esperadas) {
      expect(encontradas).toContain(ruta);
    }
  });
});
