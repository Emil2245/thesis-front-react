import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { espiar } from "@/test/espia";
import { AdminUsuariosPage } from "@/features/admin/pages/AdminUsuariosPage";
import { AdminLogsPage } from "@/features/admin/pages/AdminLogsPage";
import { AdminPlantillasPage } from "@/features/admin/pages/AdminPlantillasPage";
import { AdminValoresPage } from "@/features/admin/pages/AdminValoresPage";
import { AdminParametrosPage } from "@/features/admin/pages/AdminParametrosPage";
import { parametrosSistemaFixture } from "@/test/fixtures/admin";

// El contrato de una pantalla degradada es *no pedir nada*: las rutas
// `/admin/usuarios`, `/admin/logs`, `/admin/plantillas` y
// `/admin/valores-referencia` no existen en el backend. Que el texto salga no
// prueba gran cosa; que no salga ninguna petición, sí. `espiar()` lo mide.
const degradadas = [
  ["AdminUsuariosPage", AdminUsuariosPage, "Usuarios"],
  ["AdminLogsPage", AdminLogsPage, "Registro de actividades"],
  ["AdminPlantillasPage", AdminPlantillasPage, "Plantillas del sistema"],
  ["AdminValoresPage", AdminValoresPage, "Valores de referencia"],
] as const;

describe.each(degradadas)("%s (degradada)", (_nombre, Pagina, titulo) => {
  it("anuncia que no está disponible y no llama a ninguna ruta inexistente", async () => {
    const peticiones = espiar();
    renderConProviders(<Pagina />);

    expect(screen.getByText(titulo)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument(),
    );
    expect(peticiones).toHaveLength(0);
  });
});

// Ésta sí está viva, y su ruta es la trampa: el backend expone la lectura en
// `/proyectos/parametros-sistema`, NO bajo `/admin` (plan 027). Parece un error
// de copia y alguien la va a «corregir» a `/admin/parametros-sistema».
describe("AdminParametrosPage", () => {
  it("lee los parámetros de /proyectos/parametros-sistema, no de /admin", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminParametrosPage />);

    expect(await screen.findByText("Configuración global")).toBeInTheDocument();
    const rutas = peticiones.map((p) => p.ruta);
    expect(rutas).toContain("/api/v1/proyectos/parametros-sistema");
    expect(rutas.some((r) => r.startsWith("/api/v1/admin"))).toBe(false);
  });

  it("pinta los valores que devuelve el backend", async () => {
    renderConProviders(<AdminParametrosPage />);

    expect(await screen.findByLabelText("% Herramienta menor")).toHaveValue(
      parametrosSistemaFixture.porcentajeHerramientaMenor,
    );
    expect(screen.getByLabelText("Moneda")).toHaveValue(parametrosSistemaFixture.moneda);
  });

  it("mantiene «Guardar» deshabilitado: la escritura no existe en el backend", async () => {
    renderConProviders(<AdminParametrosPage />);

    expect(await screen.findByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
