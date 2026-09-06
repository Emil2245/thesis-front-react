import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { parametrosSistemaFixture } from "@/test/fixtures/admin";
import { DialogoDescuentoGlobal } from "@/features/proyectos/components/DialogoDescuentoGlobal";

const API = "*/api/v1";

describe("DialogoDescuentoGlobal", () => {
  it("renderiza el diálogo", () => {
    renderConProviders(<DialogoDescuentoGlobal abierto onClose={() => {}} presupuestoId={1} />);
    expect(screen.getByText(/descuento global/i)).toBeInTheDocument();
  });

  // 0.29 * 100 en float64 da 28.999999999999996 y acababa impreso en la etiqueta.
  it("muestra el rango máximo sin cola de float", async () => {
    server.use(
      http.get(`${API}/proyectos/parametros-sistema`, () =>
        HttpResponse.json({ ...parametrosSistemaFixture, rangoDescuentoMax: "0.2900" }),
      ),
    );
    renderConProviders(<DialogoDescuentoGlobal abierto onClose={() => {}} presupuestoId={1} />);
    await waitFor(() => expect(screen.getByText("Porcentaje (0–29 %)")).toBeInTheDocument());
  });
});
