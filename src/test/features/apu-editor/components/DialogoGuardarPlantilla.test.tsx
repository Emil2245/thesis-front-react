import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoGuardarPlantilla } from "@/features/apu-editor/components/DialogoGuardarPlantilla";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

describe("DialogoGuardarPlantilla", () => {
  it("nombre vacío muestra error", async () => {
    const { user } = renderConProviders(
      <DialogoGuardarPlantilla
        abierto
        onClose={() => {}}
        apuId={"018f8a40-0000-7000-8000-000000000001"}
      />,
    );

    await user.click(screen.getByText("Guardar plantilla"));
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("guarda exitosamente y llama onClose", async () => {
    const onClose = vi.fn();
    server.use(
      http.post(`${API}/apus/:id/guardar-plantilla`, () =>
        HttpResponse.json(
          {
            id: "018f8a1e-0000-7000-8000-000000000099",
            nombre: "Mi plantilla",
            tipo: "PERSONAL",
            fechaCreacion: "2026-07-23T00:00:00",
          },
          { status: 201 },
        ),
      ),
    );

    const { user } = renderConProviders(
      <DialogoGuardarPlantilla
        abierto
        onClose={onClose}
        apuId={"018f8a40-0000-7000-8000-000000000001"}
      />,
    );

    await user.type(screen.getByLabelText(/Nombre/), "Mi plantilla");
    await user.click(screen.getByText("Guardar plantilla"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("muestra texto de ayuda", () => {
    renderConProviders(
      <DialogoGuardarPlantilla
        abierto
        onClose={() => {}}
        apuId={"018f8a40-0000-7000-8000-000000000001"}
      />,
    );

    expect(
      screen.getByText(/La plantilla guarda insumos, cantidades y rendimientos/),
    ).toBeInTheDocument();
  });
});
