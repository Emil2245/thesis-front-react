import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { PopoverDesglose } from "@/features/apu-editor/components/PopoverDesglose";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

describe("PopoverDesglose", () => {
  it("renderiza fórmulas textualmente", async () => {
    server.use(
      http.get(`${API}/apus/:id/calculo`, () =>
        HttpResponse.json({
          formulas: [
            { concepto: "HM", formula: "5% × 8.99", resultado: "0.45" },
            { concepto: "CD", formula: "Suma M+N+O+P", resultado: "800.00" },
          ],
          subtotales: { M: "400.00", N: "400.00", O: "0.00", P: "0.00" },
          cd: "800.00",
          ci: "120.00",
          ct: "920.00",
        }),
      ),
    );

    renderConProviders(
      <PopoverDesglose abierto onClose={() => {}} apuId={"018f8a40-0000-7000-8000-000000000001"} />,
    );

    await waitFor(() => {
      expect(screen.getByText("5% × 8.99")).toBeInTheDocument();
      expect(screen.getByText("Suma M+N+O+P")).toBeInTheDocument();
    });
  });

  // El paso CD_ajustado se retiró del motor (rollout 2026-08-31): la cadena
  // activa es CD → CI → CT y ApuCalculoResponse ya no trae cdAjustado.
  it("no muestra CD Ajustado", async () => {
    renderConProviders(
      <PopoverDesglose abierto onClose={() => {}} apuId={"018f8a40-0000-7000-8000-000000000001"} />,
    );

    await waitFor(() => expect(screen.getByText("Suma M+N+O+P")).toBeInTheDocument());
    expect(screen.queryByText(/CD Ajustado/i)).not.toBeInTheDocument();
  });

  it("muestra subtotales por bloque", async () => {
    renderConProviders(
      <PopoverDesglose abierto onClose={() => {}} apuId={"018f8a40-0000-7000-8000-000000000001"} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Subtotales por bloque")).toBeInTheDocument();
    });
  });
});
