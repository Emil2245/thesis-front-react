import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoUsoInsumo } from "@/features/insumos/components/DialogoUsoInsumo";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

const PROYECTO = "01927f4e-1a2b-7c3d-8e4f-000000000001";
const INSUMO = "018f8a20-0000-7000-8000-000000000010";

/**
 * Los usos salen SIEMPRE de `GET /proyectos/{id}/insumos/{iid}/usos`. Nunca
 * llegaron "precargados" en el cuerpo del error de borrado: `ErrorPayload` son
 * dos strings y no puede transportar una lista.
 */
describe("DialogoUsoInsumo", () => {
  const onClose = () => {};

  it("pide los usos al endpoint y los pinta", async () => {
    renderConProviders(
      <DialogoUsoInsumo abierto={true} onClose={onClose} proyectoId={PROYECTO} insumoId={INSUMO} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Uso del insumo/i)).toBeInTheDocument();
      expect(
        screen.getByText(/APUs de este proyecto que referencian el insumo/i),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });

  // Una tabla con cabeceras y cero filas no distingue "no se usa" de "está roto".
  it("con la lista vacía explica que no hay usos y no pinta la tabla", async () => {
    server.use(http.get(`${API}/proyectos/:id/insumos/:iid/usos`, () => HttpResponse.json([])));

    renderConProviders(
      <DialogoUsoInsumo abierto={true} onClose={onClose} proyectoId={PROYECTO} insumoId={INSUMO} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Este insumo no aparece en ningún APU de este proyecto/i),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Origen del precio")).not.toBeInTheDocument();
  });
});
