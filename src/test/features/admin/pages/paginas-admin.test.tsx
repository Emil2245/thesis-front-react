import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
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

  // `PUT /proyectos/parametros-sistema` sí existe (SUPER_ADMIN); lo que no
  // existía era el formulario completo. Con 4 de los 10 campos `@NotNull` el
  // backend devuelve 400, así que encender el botón sin los 11 campos habría
  // cambiado un tooltip por un error.
  it("«Guardar» está activo: la escritura existe en el backend", async () => {
    renderConProviders(<AdminParametrosPage />);

    expect(await screen.findByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("edita los rangos aplicables sin exponer descuento global", async () => {
    renderConProviders(<AdminParametrosPage />);

    for (const etiqueta of [
      "Rango HM mínimo",
      "Rango HM máximo",
      "Rango CI mínimo",
      "Rango CI máximo",
      "Rango IVA mínimo",
      "Rango IVA máximo",
    ]) {
      expect(await screen.findByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/Rango descuento/i)).not.toBeInTheDocument();
  });

  it("guarda mandando los 11 campos numéricos, no 4", async () => {
    const user = userEvent.setup();
    const peticiones = espiar();
    renderConProviders(<AdminParametrosPage />);

    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", "/parametros-sistema");
      expect(Object.keys(p?.cuerpo as Record<string, unknown>).sort()).toEqual(
        [
          "iva",
          "moneda",
          "porcentajeHerramientaMenor",
          "porcentajeIndirecto",
          "rangoCiMax",
          "rangoCiMin",
          "rangoDescuentoMax",
          "rangoDescuentoMin",
          "rangoHmMax",
          "rangoHmMin",
          "rangoIvaMax",
          "rangoIvaMin",
        ].sort(),
      );
    });
  });

  it("manda los importes como números, no como decimal string", async () => {
    const user = userEvent.setup();
    const peticiones = espiar();
    renderConProviders(<AdminParametrosPage />);

    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const cuerpo = ultima(peticiones, "PUT", "/parametros-sistema")?.cuerpo as Record<
        string,
        unknown
      >;
      expect(cuerpo.iva).toBe(0.12);
      expect(typeof cuerpo.rangoHmMax).toBe("number");
    });
  });
});
