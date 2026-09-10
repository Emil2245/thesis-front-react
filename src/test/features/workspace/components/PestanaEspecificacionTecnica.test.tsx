import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { PestanaEspecificacionTecnica } from "@/features/workspace/components/PestanaEspecificacionTecnica";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

const etUrl = "*/api/v1/apus/:id/especificacion-tecnica";

describe("PestanaEspecificacionTecnica", () => {
  it.each([null, ""])("renders the empty specification state for %s", async (contenido) => {
    server.use(http.get(etUrl, ({ params }) => HttpResponse.json({ apuId: params.id, contenido })));
    renderConProviders(
      <PestanaEspecificacionTecnica apuId={apuDetalleFixture.id} presupuestoId="presupuesto-1" />,
    );
    expect(await screen.findByText("Sin especificación técnica")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
