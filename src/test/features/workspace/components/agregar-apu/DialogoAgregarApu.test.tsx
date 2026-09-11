import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DialogoAgregarApu } from "@/features/workspace/components/DialogoAgregarApu";
import { espiar, ultima } from "@/test/espia";
import { PLANTILLA_APU_1, PLANTILLA_APU_2, PLANTILLA_LOTE_ERROR } from "@/test/fixtures/apu";
import { CAPITULO_1_1, PRESUPUESTO_V2, presupuestoFixture } from "@/test/fixtures/presupuesto";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn() },
}));

const API = "*/api/v1";
const plantillaA = {
  id: PLANTILLA_APU_1,
  nombre: "Hormigón estructural",
  descripcionRubro: "Hormigón para elementos estructurales",
  unidad: "m3",
  tipo: "SISTEMA" as const,
  createdAt: "2026-07-01T00:00:00",
  updatedAt: "2026-07-01T00:00:00",
};
const plantillaB = {
  id: PLANTILLA_APU_2,
  nombre: "Acero de refuerzo",
  descripcionRubro: "Acero personal",
  unidad: "kg",
  tipo: "PERSONAL" as const,
  createdAt: "2026-07-02T00:00:00",
  updatedAt: "2026-07-02T00:00:00",
};

function pagina(items = [plantillaA, plantillaB]) {
  return { items, total: items.length, page: 0, size: 20, totalPaginas: items.length ? 1 : 0 };
}

function instalarCatalogo() {
  server.use(
    http.get(`${API}/plantillas-apu/busqueda`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      const tipos = params.getAll("tipo");
      const q = params.get("q")?.toLowerCase() ?? "";
      return HttpResponse.json(
        pagina(
          [plantillaA, plantillaB].filter(
            (plantilla) =>
              tipos.includes(plantilla.tipo) && plantilla.nombre.toLowerCase().includes(q),
          ),
        ),
      );
    }),
    http.get(`${API}/plantillas-apu/:id`, ({ params }) => {
      const plantilla = params.id === PLANTILLA_APU_2 ? plantillaB : plantillaA;
      return HttpResponse.json({
        ...plantilla,
        snapshotSecciones: {
          secciones: [
            {
              tipo: "MATERIAL",
              lineas: [{ insumoCodigo: "MAT-001", cantidad: "2.000000", rendimiento: "0.500000" }],
            },
          ],
        },
      });
    }),
  );
}

function renderDialogo(overrides: Partial<React.ComponentProps<typeof DialogoAgregarApu>> = {}) {
  const onOpenChange = vi.fn();
  const onCrearManualmente = vi.fn();
  const result = renderConProviders(
    <DialogoAgregarApu
      open
      onOpenChange={onOpenChange}
      onCrearManualmente={onCrearManualmente}
      presupuestoId={PRESUPUESTO_V2}
      proyectoId="0198c1a3-0000-7000-8000-000000000001"
      capitulos={presupuestoFixture.capitulos}
      {...overrides}
    />,
  );
  return { ...result, onOpenChange, onCrearManualmente };
}

beforeEach(() => {
  vi.clearAllMocks();
  instalarCatalogo();
});

describe("DialogoAgregarApu", () => {
  it("consulta la primera página, filtra fuentes independientemente y debounces la búsqueda", async () => {
    const peticiones = espiar();
    const { user } = renderDialogo();

    await screen.findByRole("button", { name: /Ver detalles de Hormigón estructural/ });
    let busquedas = peticiones.filter((p) => p.url.pathname.endsWith("/plantillas-apu/busqueda"));
    expect(busquedas).toHaveLength(1);
    expect(busquedas[0]?.url.searchParams.getAll("tipo")).toEqual(["SISTEMA", "PERSONAL"]);
    expect(busquedas[0]?.url.searchParams.get("page")).toBe("0");

    await user.click(screen.getByRole("checkbox", { name: "Incluir plantillas del sistema" }));
    await waitFor(() => {
      const request = ultima(peticiones, "GET", "/plantillas-apu/busqueda");
      expect(request?.url.searchParams.getAll("tipo")).toEqual(["PERSONAL"]);
    });

    await user.click(screen.getByRole("checkbox", { name: "Incluir plantillas personales" }));
    const totalSinFuentes = peticiones.length;
    await user.type(screen.getByRole("searchbox", { name: "Buscar plantillas" }), "hor");
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(peticiones).toHaveLength(totalSinFuentes);
    expect(screen.getByText("Selecciona al menos una fuente.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Incluir plantillas del sistema" }));
    const buscador = screen.getByRole("searchbox", { name: "Buscar plantillas" });
    await user.clear(buscador);
    await user.type(buscador, "hor");
    await waitFor(
      () => {
        busquedas = peticiones.filter(
          (p) =>
            p.url.pathname.endsWith("/plantillas-apu/busqueda") &&
            p.url.searchParams.get("q") === "hor",
        );
        expect(busquedas).toHaveLength(1);
      },
      { timeout: 800 },
    );
  });

  it("mantiene activa la fila al marcar y envía los checks en orden visual, sin sumar la activa", async () => {
    const peticiones = espiar();
    const { user, onOpenChange } = renderDialogo();

    const filaB = await screen.findByRole("button", { name: /Ver detalles de Acero de refuerzo/ });
    await user.click(filaB);
    expect(await screen.findByRole("heading", { name: "Acero de refuerzo" })).toBeInTheDocument();

    const checkboxB = screen.getByRole("checkbox", { name: "Seleccionar Acero de refuerzo" });
    expect(filaB).not.toContainElement(checkboxB);
    expect(filaB.closest("li")).toContainElement(checkboxB);
    await user.click(checkboxB);
    await user.click(screen.getByRole("checkbox", { name: "Seleccionar Hormigón estructural" }));
    expect(filaB).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Agregar plantillas" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(
      peticiones.filter(
        (peticion) =>
          peticion.metodo === "POST" &&
          peticion.ruta.endsWith(`/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`),
      ),
    ).toHaveLength(1);
    expect(
      ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`)?.cuerpo,
    ).toEqual({
      plantillaIds: [PLANTILLA_APU_1, PLANTILLA_APU_2],
    });
  });

  it("usa solo la fila activa y preserva el capítulo contextual válido", async () => {
    const peticiones = espiar();
    const { user } = renderDialogo({ defaultCapituloId: CAPITULO_1_1 });

    await user.click(
      await screen.findByRole("button", { name: /Ver detalles de Hormigón estructural/ }),
    );
    expect(screen.getByRole("combobox", { name: "Capítulo de destino" })).toHaveTextContent(
      "1.1 · Instalación de campamento",
    );
    await user.click(screen.getByRole("button", { name: "Agregar plantillas" }));

    await waitFor(() =>
      expect(
        ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`)
          ?.cuerpo,
      ).toEqual({ capituloId: CAPITULO_1_1, plantillaIds: [PLANTILLA_APU_1] }),
    );
  });

  it("mantiene diálogo y selección ante fallo atómico, y anuncia la plantilla", async () => {
    server.use(
      http.get(`${API}/plantillas-apu/busqueda`, () =>
        HttpResponse.json(
          pagina([{ ...plantillaA, id: PLANTILLA_LOTE_ERROR, nombre: "Plantilla conflictiva" }]),
        ),
      ),
      http.post(`${API}/presupuestos/:id/rubros/desde-plantillas`, () =>
        HttpResponse.json(
          {
            codigo: "no-encontrado",
            mensaje: "No se pudo aplicar la plantilla en la posición 1",
            detalles: { indice: 0, plantillaId: PLANTILLA_LOTE_ERROR },
          },
          { status: 404 },
        ),
      ),
    );
    const { user, onOpenChange } = renderDialogo();

    await user.click(
      await screen.findByRole("checkbox", { name: "Seleccionar Plantilla conflictiva" }),
    );
    await user.click(screen.getByRole("button", { name: "Agregar plantillas" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Plantilla conflictiva");
    expect(screen.getByRole("dialog", { name: "Agregar APU" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Seleccionar Plantilla conflictiva" }),
    ).toBeChecked();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("omite capituloId para Al final, agrupa advertencias y cierra solo tras éxito", async () => {
    server.use(
      http.post(`${API}/presupuestos/:id/rubros/desde-plantillas`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
          {
            presupuesto: presupuestoFixture,
            resultados: [
              {
                plantillaId: PLANTILLA_APU_1,
                plantillaNombre: plantillaA.nombre,
                apuId: "018f8a40-0000-7000-8000-000000000099",
                codigo: "APU-099",
                advertencias: [
                  {
                    insumoCodigo: "MAT-001",
                    motivo: "NO_ENCONTRADO",
                    mensaje: "Insumo sin precio",
                  },
                ],
              },
            ],
          },
          { status: body ? 201 : 500 },
        );
      }),
    );
    const peticiones = espiar();
    const { user, onOpenChange } = renderDialogo();

    await user.click(
      await screen.findByRole("button", { name: /Ver detalles de Hormigón estructural/ }),
    );
    await user.click(screen.getByRole("button", { name: "Agregar plantillas" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(
      ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`)?.cuerpo,
    ).toEqual({
      plantillaIds: [PLANTILLA_APU_1],
    });
    expect(toast.warning).toHaveBeenCalledWith("Hormigón estructural: MAT-001 — Insumo sin precio");
  });

  it("expone detalle price-free, navegación por teclado y la callback manual", async () => {
    const { user, onCrearManualmente } = renderDialogo();

    const filaA = await screen.findByRole("button", {
      name: /Ver detalles de Hormigón estructural/,
    });
    filaA.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("heading", { name: "Hormigón estructural" });

    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("button", { name: /Ver detalles de Acero de refuerzo/ }),
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("checkbox", { name: "Seleccionar Acero de refuerzo" }),
    ).not.toBeChecked();

    filaA.focus();
    await user.keyboard(" ");
    expect(filaA).toHaveAttribute("aria-current", "true");
    const detalle = screen.getByRole("region", { name: "Detalle de plantilla" });
    expect(within(detalle).getByText("Materiales (O)")).toBeInTheDocument();
    expect(within(detalle).getByText("MAT-001")).toBeInTheDocument();
    expect(within(detalle).getByText(/Cantidad: 2.000000/)).toBeInTheDocument();
    expect(within(detalle).queryByText(/precio|subtotal|costo/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Crear manualmente" }));
    expect(onCrearManualmente).toHaveBeenCalledOnce();
  });
});
