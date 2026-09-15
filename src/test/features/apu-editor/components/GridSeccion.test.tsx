import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { GridSeccion } from "@/features/apu-editor/components/GridSeccion";
import type { SeccionEditor } from "@/features/apu-editor/hooks/useApuEditor";
import type { ApuDetalleResponse } from "@/api/contract";

function construirSeccion(overrides: Partial<SeccionEditor> = {}): SeccionEditor {
  return {
    tipo: "MATERIAL",
    etiqueta: "Materiales",
    bloque: "O",
    subtotal: 0,
    filas: [],
    muestraRendimiento: false,
    ...overrides,
  };
}

function construirFila(overrides: Partial<ApuDetalleResponse> = {}): ApuDetalleResponse {
  return {
    id: "018f8a50-0000-7000-8000-000000000010",
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
    ...overrides,
  };
}

describe("GridSeccion", () => {
  it("renderiza la tarjeta cuando la sección no tiene filas", () => {
    renderConProviders(
      <GridSeccion
        seccion={construirSeccion()}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={vi.fn()}
      />,
    );
    expect(screen.getByText("Materiales")).toBeInTheDocument();
  });

  it("muestra un botón accesible Agregar insumo cuando la sección está vacía", () => {
    renderConProviders(
      <GridSeccion
        seccion={construirSeccion()}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={vi.fn()}
      />,
    );
    const boton = screen.getByRole("button", { name: /Agregar insumo/ });
    expect(boton).toBeInTheDocument();
  });

  it("invoca onAgregarInsumo con el tipo de la sección al pulsar el botón", async () => {
    const onAgregarInsumo = vi.fn();
    const { user } = renderConProviders(
      <GridSeccion
        seccion={construirSeccion({ tipo: "TRANSPORTE", etiqueta: "Transporte", bloque: "P" })}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={onAgregarInsumo}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Agregar insumo/ }));
    expect(onAgregarInsumo).toHaveBeenCalledWith("TRANSPORTE");
  });

  it("sigue mostrando las filas cuando la sección tiene detalle", () => {
    renderConProviders(
      <GridSeccion
        seccion={construirSeccion({
          tipo: "EQUIPO",
          etiqueta: "Equipo",
          bloque: "M",
          muestraRendimiento: true,
          filas: [
            {
              detalle: construirFila({
                descripcion: "Retroexcavadora",
                rendimiento: 0.05,
                costoHora: 900,
              }),
              protegida: false,
              heredado: true,
              estado: "estable",
              mensajesValidacion: {},
            },
          ],
        })}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={vi.fn()}
      />,
    );
    expect(screen.getByText("Retroexcavadora")).toBeInTheDocument();
  });

  it("también expone el botón Agregar insumo cuando la sección ya tiene filas", () => {
    renderConProviders(
      <GridSeccion
        seccion={construirSeccion({
          filas: [
            {
              detalle: construirFila(),
              protegida: false,
              heredado: true,
              estado: "estable",
              mensajesValidacion: {},
            },
          ],
        })}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Agregar insumo/ })).toBeInTheDocument();
  });

  // Triangulación: el botón lleva el nombre del bloque (M/N/O/P) en su aria-label
  // para que dos secciones con la misma etiqueta raíz (p.ej. EQUIPO y MANO_OBRA
  // no chocan aquí, pero el patrón se repite al añadir otra sección) sigan siendo
  // distinguibles por screen readers.
  it("el aria-label del botón identifica la sección a la que añade", () => {
    renderConProviders(
      <GridSeccion
        seccion={construirSeccion({ tipo: "EQUIPO", etiqueta: "Equipo", bloque: "M" })}
        onEditarCelda={vi.fn()}
        onRestaurarHerencia={vi.fn()}
        onEliminarFila={vi.fn()}
        onReordenarFila={vi.fn()}
        onAgregarInsumo={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Agregar insumo a Equipo/ })).toBeInTheDocument();
  });
});
