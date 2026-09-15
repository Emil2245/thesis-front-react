import { asDecimal } from "@/lib/decimal";
import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { EditorApuPage } from "@/features/apu-editor/pages/EditorApuPage";
import { apuDetalleFixture } from "@/test/fixtures/apu";

const API = "*/api/v1";

function renderEditor() {
  return renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/apus/:apuId" element={<EditorApuPage />} />
    </Routes>,
    {
      ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/apus/018f8a40-0000-7000-8000-000000000001",
    },
  );
}

describe("EditorApuPage", () => {
  it("renders section headers", async () => {
    renderEditor();
    await waitFor(() => {
      const equipoHeaders = screen.getAllByText((c) => c.includes("Equipo"));
      expect(equipoHeaders.length).toBeGreaterThanOrEqual(1);
      const manoObraHeaders = screen.getAllByText((c) => c.includes("Mano de obra"));
      expect(manoObraHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("HM row is displayed", async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText((c) => c.includes("Herramienta Menor"))).toBeInTheDocument();
    });
  });

  it("footer renders CD, CI, CT labels from fixture", async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText("Costo Directo")).toBeInTheDocument();
      expect(screen.getByText("Costo Indirecto")).toBeInTheDocument();
      expect(screen.getByText("Costo Total")).toBeInTheDocument();
    });
  });

  // Plan 052 rebanada 2: `POST /apus/{apuId}/guardar-plantilla` existe en
  // origin/main y el diálogo estaba construido; solo faltaba quitar el gate.
  it("Guardar como plantilla está habilitado y abre el diálogo", async () => {
    const { user } = renderEditor();

    const boton = await screen.findByRole("button", { name: /Guardar como plantilla/ });
    expect(boton).toBeEnabled();

    await user.click(boton);
    expect(await screen.findByLabelText(/Nombre/)).toBeInTheDocument();
  });

  it("usa la versión vigente cuando la URL no trae ?v=", async () => {
    let peticionVersiones: string | null = null;
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, ({ request }) => {
        peticionVersiones = new URL(request.url).pathname;
        return HttpResponse.json([
          {
            presupuestoId: "0198c1a0-0000-7000-8000-000000000010",
            version: 1,
            esVigente: false,
            notas: "Primera versión",
            totalGeneral: asDecimal("1000.000000"),
            fechaCreacion: "2026-02-01T00:00:00",
          },
          {
            presupuestoId: "0198c1a0-0000-7000-8000-000000000011",
            version: 2,
            esVigente: true,
            notas: "Segunda versión",
            totalGeneral: asDecimal("1200.000000"),
            fechaCreacion: "2026-03-01T00:00:00",
          },
        ]);
      }),
    );

    renderEditor();
    await waitFor(() => {
      expect(screen.getAllByText((c) => c.includes("Mano de obra")).length).toBeGreaterThanOrEqual(
        1,
      );
    });

    // El editor resuelve la versión activa del selector (vigente = 11), no del
    // parámetro de ruta; sin versiones no habría presupuesto que invalidar.
    expect(peticionVersiones).toBe(
      "/api/v1/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/presupuestos",
    );
  });

  // Plan 074 §2: un APU vacío expone las cuatro secciones del editor con su
  // botón Agregar insumo. Sin esta entrada, el usuario que abre un APU recién
  // creado no tiene forma de armarlo desde aquí — el alta completa de F-004 vive
  // en `WorkspacePage` y no se duplica aquí.
  it("renderiza las cuatro secciones aunque el APU esté vacío", async () => {
    server.use(
      http.get(`${API}/apus/:id`, () =>
        HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) => ({ ...s, detalles: [] })),
        }),
      ),
    );
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText("Equipo")).toBeInTheDocument();
      expect(screen.getByText("Mano de obra")).toBeInTheDocument();
      expect(screen.getByText("Materiales")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
    });
  });

  it("cada sección vacía expone un botón accesible Agregar insumo", async () => {
    server.use(
      http.get(`${API}/apus/:id`, () =>
        HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) => ({ ...s, detalles: [] })),
        }),
      ),
    );
    renderEditor();
    await waitFor(() => {
      // Cuatro secciones, cuatro botones.
      expect(screen.getAllByRole("button", { name: /Agregar insumo/ })).toHaveLength(4);
    });
  });

  it("abrir el selector en una sección abre el diálogo con esa sección", async () => {
    server.use(
      http.get(`${API}/apus/:id`, () =>
        HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) => ({ ...s, detalles: [] })),
        }),
      ),
    );
    const { user } = renderEditor();
    const botones = await screen.findAllByRole("button", { name: /Agregar insumo/ });
    await user.click(botones[2]); // Materiales
    expect(await screen.findByRole("dialog", { name: /Seleccionar insumo/ })).toBeInTheDocument();
  });

  it("seleccionar un insumo llama agregarFila con la sección correcta y aparece la fila", async () => {
    let cuerpoPost: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API}/apus/:id`, () =>
        HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) => ({ ...s, detalles: [] })),
        }),
      ),
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpoPost = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) =>
            s.tipo === cuerpoPost!.seccionTipo
              ? {
                  ...s,
                  detalles: [
                    {
                      id: "018f8a50-0000-7000-8000-000000000500",
                      orden: 1,
                      descripcion: "Cemento Portland",
                      esHerramientaMenor: false,
                      insumoId: cuerpoPost!.insumoId,
                      cantidad: 1,
                      rendimiento: null,
                      unidad: "kg",
                      precioEfectivo: 12.5,
                      precioHeredado: true,
                      costoHora: null,
                      costo: 12.5,
                    },
                  ],
                }
              : s,
          ),
        });
      }),
    );
    const { user } = renderEditor();
    const botones = await screen.findAllByRole("button", { name: /Agregar insumo/ });
    await user.click(botones[2]); // Materiales
    const opcion = await screen.findByText(/Cemento Portland Tipo I/);
    await user.click(opcion.closest("button")!);

    await waitFor(() => {
      expect(cuerpoPost?.seccionTipo).toBe("MATERIAL");
      expect(cuerpoPost?.insumoId).toBe("018f8a20-0000-7000-8000-000000000010");
    });
    await waitFor(() => {
      expect(screen.getByText("Cemento Portland")).toBeInTheDocument();
    });
  });

  // Cobertura adicional (hallazgo restante §4): tras seleccionar un insumo y
  // agregarlo, el diálogo del selector debe cerrarse. Sin esto el usuario
  // queda atrapado en el modal incluso después de ver la fila creada en la
  // sección.
  it("cierra el diálogo del selector tras una selección exitosa", async () => {
    server.use(
      http.get(`${API}/apus/:id`, () =>
        HttpResponse.json({
          ...apuDetalleFixture,
          secciones: apuDetalleFixture.secciones.map((s) => ({ ...s, detalles: [] })),
        }),
      ),
      http.post(`${API}/apus/:id/detalles`, () =>
        HttpResponse.json(
          {
            ...apuDetalleFixture,
            secciones: apuDetalleFixture.secciones.map((s) =>
              s.tipo === "MATERIAL"
                ? {
                    ...s,
                    detalles: [
                      {
                        id: "018f8a50-0000-7000-8000-000000000500",
                        orden: 1,
                        descripcion: "Cemento Portland",
                        esHerramientaMenor: false,
                        insumoId: "018f8a20-0000-7000-8000-000000000010",
                        cantidad: 1,
                        rendimiento: null,
                        unidad: "kg",
                        precioEfectivo: 12.5,
                        precioHeredado: true,
                        costoHora: null,
                        costo: 12.5,
                      },
                    ],
                  }
                : s,
            ),
          },
          { status: 201 },
        ),
      ),
    );
    const { user } = renderEditor();
    const botones = await screen.findAllByRole("button", { name: /Agregar insumo/ });
    await user.click(botones[2]); // Materiales
    expect(await screen.findByRole("dialog", { name: /Seleccionar insumo/ })).toBeInTheDocument();
    const opcion = await screen.findByText(/Cemento Portland Tipo I/);
    await user.click(opcion.closest("button")!);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /Seleccionar insumo/ })).not.toBeInTheDocument();
    });
  });

  // Triangulación: un APU parcial (con filas en EQUIPO/MANO_OBRA pero MATERIAL
  // y TRANSPORTE vacíos) sigue mostrando las cuatro secciones. No es un caso
  // patológico: el alta de F-004 crea APUs así y el editor posterior debe
  // permitir completarlos.
  it("mantiene la visibilidad de las secciones vacías cuando otras tienen filas", async () => {
    renderEditor();
    await waitFor(() => {
      // El fixture base tiene MATERIAL y TRANSPORTE vacíos; los títulos
      // aparecen porque ya no hay early-return en GridSeccion.
      expect(screen.getByText("Materiales")).toBeInTheDocument();
      expect(screen.getByText("Transporte")).toBeInTheDocument();
    });
    // Y los botones Agregar insumo están en cada sección vacía.
    const agregarBotones = screen.getAllByRole("button", { name: /Agregar insumo/ });
    expect(agregarBotones.length).toBe(4);
  });
});
