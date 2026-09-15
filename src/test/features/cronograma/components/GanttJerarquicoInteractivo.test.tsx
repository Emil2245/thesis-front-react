import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { ACTIVIDAD_3, CRONOGRAMA_ID, cronogramaVistasFixture } from "@/test/fixtures/cronograma";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { GanttJerarquicoInteractivo } from "@/features/cronograma/components/GanttJerarquicoInteractivo";
import type { ActividadCronogramaResponse } from "@/api/contract";

const API = "*/api/v1";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const actividadSeleccionada = vi.fn<(actividad: ActividadCronogramaResponse) => void>();

function renderGantt() {
  return renderConProviders(
    <GanttJerarquicoInteractivo
      gantt={cronogramaVistasFixture.gantt}
      cronogramaId={CRONOGRAMA_ID}
      presupuestoId={PRESUPUESTO_V2}
      onClickActividad={actividadSeleccionada}
    />,
  );
}

describe("GanttJerarquicoInteractivo", () => {
  it("conserva la jerarquía, muestra rubros sin actividad y separa segmentos", () => {
    renderGantt();

    expect(screen.getByRole("heading", { name: "Gantt jerárquico" })).toBeInTheDocument();
    expect(screen.getByText("Obras preliminares")).toBeInTheDocument();
    expect(screen.getByText(/Sin actividad/)).toBeInTheDocument();
    expect(screen.getByTestId(`segmento-${ACTIVIDAD_3}-2-2`)).toBeInTheDocument();
    expect(screen.getByTestId(`segmento-${ACTIVIDAD_3}-4-4`)).toBeInTheDocument();
    expect(screen.queryByTestId(`segmento-${ACTIVIDAD_3}-2-4`)).not.toBeInTheDocument();
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByText("M4")).toBeInTheDocument();
  });

  it("mueve un segmento desde el teclado con el cuerpo canónico", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" });

    segmento.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("region", { name: /vista previa/i })).toBeInTheDocument();
    expect(segmento.style.left).toBe("131px");
    await user.click(screen.getByRole("button", { name: "Confirmar mover segmento" }));

    await waitFor(() => {
      expect(ultima(peticiones, "PATCH", `/actividades/${ACTIVIDAD_3}`)?.cuerpo).toEqual({
        operacion: "MOVER_SEGMENTO",
        inicio: 2,
        fin: 2,
        delta: 1,
      });
    });
  });

  it("acumula desplazamientos de teclado antes de confirmar", async () => {
    const { user } = renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" });

    segmento.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");

    expect(screen.getByRole("region", { name: /vista previa/i })).toHaveTextContent("4–4");
  });

  it("redimensiona mediante el control accesible y no envía coordenadas", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();
    await user.click(screen.getAllByText("Acciones de segmento")[0]);
    await user.click(
      screen.getByRole("button", { name: "Redimensionar final del segmento 2–2 una posición" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar redimensionar segmento" }));

    await waitFor(() => {
      expect(ultima(peticiones, "PATCH", `/actividades/${ACTIVIDAD_3}`)?.cuerpo).toEqual({
        operacion: "REDIMENSIONAR_SEGMENTO",
        inicio: 2,
        fin: 2,
        nuevoInicio: 2,
        nuevoFin: 3,
      });
    });
  });

  it("descarta el preview y anuncia un solapamiento 409", async () => {
    server.use(
      http.patch(`${API}/cronogramas/:id/actividades/:actId`, () =>
        HttpResponse.json(
          { codigo: "segmento-solapado", mensaje: "El destino se solapa" },
          { status: 409 },
        ),
      ),
    );
    const { user } = renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" });

    segmento.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Confirmar mover segmento" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/solapa|conflicto/i);
    });
    expect(screen.queryByRole("region", { name: /vista previa/i })).not.toBeInTheDocument();
  });

  it("convierte un drag de barra en un preview ordinal", () => {
    renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" });

    expect(segmento.style.left).toBe("67px");
    fireEvent.pointerDown(segmento, { button: 0, pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(segmento, { pointerId: 1, clientX: 64 });
    fireEvent.pointerUp(segmento, { pointerId: 1, clientX: 64 });

    expect(screen.getByRole("region", { name: /vista previa/i })).toHaveTextContent("3–3");
    expect(segmento.style.left).toBe("131px");
  });
});
