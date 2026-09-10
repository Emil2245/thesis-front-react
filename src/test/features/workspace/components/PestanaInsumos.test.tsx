import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { PestanaInsumos } from "@/features/workspace/components/PestanaInsumos";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

describe("PestanaInsumos", () => {
  it("loads the selected APU and derives rows from its details", async () => {
    let observedPath = "";
    server.use(
      http.get("*/api/v1/apus/:id", ({ request }) => {
        observedPath = new URL(request.url).pathname;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );

    renderConProviders(
      <PestanaInsumos apuId={apuDetalleFixture.id} presupuestoId="presupuesto-1" />,
    );

    expect(await screen.findByText("Retroexcavadora")).toBeInTheDocument();
    expect(screen.getByText("Albañil")).toBeInTheDocument();
    expect(observedPath).toBe(`/api/v1/apus/${apuDetalleFixture.id}`);
  });
});
