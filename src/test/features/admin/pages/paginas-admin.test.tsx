import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { AdminUsuariosPage } from "@/features/admin/pages/AdminUsuariosPage";
import { AdminLogsPage } from "@/features/admin/pages/AdminLogsPage";
import { AdminPlantillasPage } from "@/features/admin/pages/AdminPlantillasPage";
import { AdminValoresPage } from "@/features/admin/pages/AdminValoresPage";
import { AdminParametrosPage } from "@/features/admin/pages/AdminParametrosPage";
import {
  parametrosSistemaFixture,
  usuariosAdminFixture,
  plantillasAdminFixture,
  valoresReferenciaFixture,
  logsActividadFixture,
} from "@/test/fixtures/admin";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// El plan 081 retiró el gate `admin-*`: estas cuatro páginas ya no son
// wrappers degradados, delegan directo en su `*PageActiva`. El contrato que
// importa ahora es el inverso del de antes: que sí pidan su endpoint real y
// pinten los datos que devuelve, y que ya no quede rastro del aviso "todavía
// no está disponible".
const activas = [
  [
    "AdminUsuariosPage",
    AdminUsuariosPage,
    usuariosAdminFixture[0].nombre,
    "GET",
    "/admin/usuarios",
  ],
  ["AdminLogsPage", AdminLogsPage, logsActividadFixture[0].evento, "GET", "/admin/logs"],
  [
    "AdminPlantillasPage",
    AdminPlantillasPage,
    plantillasAdminFixture[0].nombre,
    "GET",
    "/admin/plantillas-apu",
  ],
  [
    "AdminValoresPage",
    AdminValoresPage,
    valoresReferenciaFixture[0].clave,
    "GET",
    "/admin/valores-referencia",
  ],
] as const;

describe.each(activas)("%s (activa)", (_nombre, Pagina, texto, metodo, ruta) => {
  it("pinta datos reales del backend y ya no anuncia que falta", async () => {
    renderConProviders(<Pagina />);

    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no está disponible/i)).not.toBeInTheDocument();
  });

  it("pide su endpoint real, no se queda en silencio", async () => {
    const peticiones = espiar();
    renderConProviders(<Pagina />);

    await screen.findByText(texto);
    expect(ultima(peticiones, metodo, ruta)?.ruta).toBe(`/api/v1${ruta}`);
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

    // El campo es de texto, no `type="number"`: ese input pinta el decimal con
    // el separador del locale del navegador («0,05» en español) y el requisito
    // es punto siempre. Por eso el valor esperado es el string con punto, no el
    // número de la fixture.
    expect(parametrosSistemaFixture.porcentajeHerramientaMenor).toBe(0.05);
    expect(await screen.findByLabelText("% Herramienta menor")).toHaveValue("0.05");
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
