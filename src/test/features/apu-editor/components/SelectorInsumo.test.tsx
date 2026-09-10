import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import { SelectorInsumo } from "@/features/apu-editor/components/SelectorInsumo";
import { server } from "@/test/server";
import { pagina } from "@/test/handlers";
import { insumosBusquedaFixture } from "@/test/fixtures/insumos";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

describe("SelectorInsumo", () => {
  const onClose = vi.fn();
  const onSeleccionar = vi.fn();

  it("renders fuente switcher", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Seleccionar insumo/)).toBeInTheDocument();
    });
  });

  it("renders source indicator for results", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Local")).toBeInTheDocument();
    });
  });

  it("shows CENTRAL source with base name", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/insumos/selector`, () =>
        HttpResponse.json(
          // Se parte de la fixture canónica y sólo se cambia lo que este caso
          // prueba. Escrito a mano le faltaban `fechaActualizacion` y
          // `desactualizado`, que `insumoBusquedaSchema` exige por ser
          // `.strict()`: la respuesta se rechazaba y la lista salía vacía.
          pagina([
            {
              ...insumosBusquedaFixture[0],
              descripcion: "Cemento IESS",
              fuente: "CENTRAL",
              baseNombre: "Base IESS 2026",
            },
          ]),
        ),
      ),
    );
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Base IESS/)).toBeInTheDocument();
    });
  });

  // N04 §A9 — «de dónde salió este precio». `fuente` da el nivel y `baseNombre`
  // la base concreta; los dos viajan ya en cada búsqueda y la UI los ignoraba:
  // un insumo central enseñaba el nombre de su base *en lugar* del nivel, y uno
  // de proyecto no enseñaba su base en absoluto.
  it("distingue la procedencia de un insumo central y uno de proyecto", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/insumos/selector`, () =>
        HttpResponse.json(
          pagina([
            {
              id: "018f8a20-0000-7000-8000-000000000100",
              codigo: "C-001",
              descripcion: "Cemento central",
              tipo: "MATERIAL",
              unidad: "kg",
              precioUnitario: 11.2,
              fechaActualizacion: "2026-05-01T00:00:00",
              desactualizado: false,
              fuente: "CENTRAL",
              baseNombre: "Base IESS 2026",
            },
            {
              id: "018f8a20-0000-7000-8000-000000000101",
              codigo: "C-002",
              descripcion: "Cemento del proyecto",
              tipo: "MATERIAL",
              unidad: "kg",
              precioUnitario: 12.4,
              fechaActualizacion: "2026-05-02T00:00:00",
              desactualizado: false,
              fuente: "PROYECTO",
              baseNombre: "Base del proyecto",
            },
          ]),
        ),
      ),
    );
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );

    // Se afirma dentro de cada fila, no sobre el documento: "Local" también es
    // el valor del filtro de fuente, y lo que importa es que cada resultado
    // lleve su propia procedencia.
    const filaCentral = (await screen.findByText(/Cemento central/)).closest("button")!;
    expect(within(filaCentral).getByText("Central")).toBeInTheDocument();
    expect(within(filaCentral).getByText("Base IESS 2026")).toBeInTheDocument();

    const filaProyecto = screen.getByText(/Cemento del proyecto/).closest("button")!;
    expect(within(filaProyecto).getByText("Local")).toBeInTheDocument();
    expect(within(filaProyecto).getByText("Base del proyecto")).toBeInTheDocument();
  });

  // `baseNombre` es nullable en el DTO. Sin nombre no hay etiqueta: la anterior
  // inventaba «Central» como valor por defecto, que es el propio nivel
  // disfrazado de nombre de base.
  it("un baseNombre nulo no pinta ninguna etiqueta de base", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/insumos/selector`, () =>
        HttpResponse.json(
          pagina([
            {
              id: "018f8a20-0000-7000-8000-000000000100",
              codigo: "C-001",
              descripcion: "Con base",
              tipo: "MATERIAL",
              unidad: "kg",
              precioUnitario: 11.2,
              fechaActualizacion: "2026-05-01T00:00:00",
              desactualizado: false,
              fuente: "CENTRAL",
              baseNombre: "Base IESS 2026",
            },
            {
              id: "018f8a20-0000-7000-8000-000000000101",
              codigo: "C-002",
              descripcion: "Sin base",
              tipo: "MATERIAL",
              unidad: "kg",
              precioUnitario: 9.9,
              fechaActualizacion: "2026-05-02T00:00:00",
              desactualizado: false,
              fuente: "CENTRAL",
              baseNombre: null,
            },
          ]),
        ),
      ),
    );
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );

    const etiquetas = await screen.findAllByTitle("Base de origen");
    expect(etiquetas).toHaveLength(1);
    expect(etiquetas[0]).toHaveTextContent("Base IESS 2026");
    // Las dos filas son CENTRAL: el nivel sí sale en ambas.
    expect(screen.getAllByText("Central")).toHaveLength(2);
  });

  it("shows local and central search results", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      const items = screen.getAllByText((c) => c.includes("Cemento"));
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
