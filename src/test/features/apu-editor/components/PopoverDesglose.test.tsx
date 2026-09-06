import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { PopoverDesglose } from "@/features/apu-editor/components/PopoverDesglose";

const APU_ID = "018f8a40-0000-7000-8000-000000000001";

describe("PopoverDesglose", () => {
  // El backend ya compone la fórmula en `operacion`; el desglose la muestra tal
  // cual en vez de armarla a mano (plan 059 §1).
  it("muestra la `operacion` que compone el backend, línea a línea", async () => {
    renderConProviders(<PopoverDesglose abierto onClose={() => {}} apuId={APU_ID} />);

    await waitFor(() => {
      expect(screen.getByText("1.000000 × 45.000000 × 0.050000")).toBeInTheDocument();
    });
    expect(screen.getByText("2.000000 × 4.250000 × 0.100000")).toBeInTheDocument();
  });

  it("muestra la `operacion` de cada sección", async () => {
    renderConProviders(<PopoverDesglose abierto onClose={() => {}} apuId={APU_ID} />);

    await waitFor(() => {
      expect(screen.getByText("200.000000 + 200.000000")).toBeInTheDocument();
    });
  });

  it("agrupa las líneas por bloque M/N/O/P", async () => {
    renderConProviders(<PopoverDesglose abierto onClose={() => {}} apuId={APU_ID} />);

    await waitFor(() => {
      expect(screen.getByText("M · Equipo")).toBeInTheDocument();
    });
    expect(screen.getByText("N · Mano de obra")).toBeInTheDocument();
  });

  // El paso CD_ajustado se retiró del motor (rollout 2026-08-31): la cadena
  // activa es CD → CI → CT y ApuCalculoResponse ya no trae cdAjustado.
  it("no muestra CD Ajustado", async () => {
    renderConProviders(<PopoverDesglose abierto onClose={() => {}} apuId={APU_ID} />);

    await waitFor(() => expect(screen.getByText("CT")).toBeInTheDocument());
    expect(screen.queryByText(/CD Ajustado/i)).not.toBeInTheDocument();
  });

  it("muestra el resumen CD / CI / CT", async () => {
    renderConProviders(<PopoverDesglose abierto onClose={() => {}} apuId={APU_ID} />);

    await waitFor(() => expect(screen.getByText("CD")).toBeInTheDocument());
    expect(screen.getByText("CI")).toBeInTheDocument();
    expect(screen.getByText("CT")).toBeInTheDocument();
  });
});
