import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { parametrosSistemaFixture } from "@/test/fixtures/admin";
import {
  DialogoDescuentoGlobal,
  DialogoDescuentoGlobalActivo,
} from "@/features/proyectos/components/DialogoDescuentoGlobal";

const API = "*/api/v1";
const PRESUPUESTO_ID = "0198c1a0-0000-7000-8000-000000000011";

// El backend no tiene /descuento-global (plan 054): la especificación se cerró
// el 2026-08-31 y la implementación no existe en origin/main. El diálogo real
// se conserva como DialogoDescuentoGlobalActivo para reactivarlo cuando exista.
describe("DialogoDescuentoGlobal", () => {
  it("explica que el módulo no está disponible, sin pedir nada al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": cualquier petición
    // que se escape rompe el test.
    renderConProviders(
      <DialogoDescuentoGlobal abierto onClose={() => {}} presupuestoId={PRESUPUESTO_ID} />,
    );

    expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Porcentaje/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /aplicar descuento/i })).not.toBeInTheDocument(),
    );
  });
});

describe("DialogoDescuentoGlobalActivo", () => {
  it("renderiza el diálogo", () => {
    renderConProviders(
      <DialogoDescuentoGlobalActivo abierto onClose={() => {}} presupuestoId={PRESUPUESTO_ID} />,
    );
    expect(screen.getByText(/descuento global/i)).toBeInTheDocument();
  });

  // 0.29 * 100 en float64 da 28.999999999999996 y acababa impreso en la etiqueta.
  it("muestra el rango máximo sin cola de float", async () => {
    server.use(
      http.get(`${API}/proyectos/parametros-sistema`, () =>
        HttpResponse.json({ ...parametrosSistemaFixture, rangoDescuentoMax: 0.29 }),
      ),
    );
    renderConProviders(
      <DialogoDescuentoGlobalActivo abierto onClose={() => {}} presupuestoId={PRESUPUESTO_ID} />,
    );
    await waitFor(() => expect(screen.getByText("Porcentaje (0–29 %)")).toBeInTheDocument());
  });

  // La forma canónica (07-api-contract.md §5, rollout 2026-08-31) trae cdAntes;
  // cdAjustado está WITHDRAWN junto con el paso CD_ajustado del motor.
  it("rotula la columna del CD previo como «CD antes», no «CD ajustado»", async () => {
    const { user } = renderConProviders(
      <DialogoDescuentoGlobalActivo abierto onClose={() => {}} presupuestoId={PRESUPUESTO_ID} />,
    );

    await user.type(screen.getByLabelText(/Porcentaje/), "5");

    await waitFor(() => expect(screen.getByText("CD antes")).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.queryByText(/CD ajustado/i)).not.toBeInTheDocument();
  });
});
