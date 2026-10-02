import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";

import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import {
  ACTIVIDAD_1,
  ACTIVIDAD_3,
  CRONOGRAMA_ID,
  cronogramaVistasFixture,
  preflightBloqueadoFixture,
} from "@/test/fixtures/cronograma";
import { asDecimal } from "@/lib/decimal";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { GanttJerarquicoInteractivo } from "@/features/cronograma/components/GanttJerarquicoInteractivo";
import type { ActividadCronogramaResponse, GanttBloqueResponse } from "@/api/contract";

const API = "*/api/v1";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderGantt(gantt: GanttBloqueResponse = cronogramaVistasFixture.gantt) {
  return renderConProviders(
    <GanttJerarquicoInteractivo
      gantt={gantt}
      cronogramaId={CRONOGRAMA_ID}
      presupuestoId={PRESUPUESTO_V2}
    />,
  );
}

const cuerpoDe = async (peticiones: ReturnType<typeof espiar>, actividadId: string) => {
  let cuerpo: unknown;
  await waitFor(() => {
    cuerpo = ultima(peticiones, "PATCH", `/actividades/${actividadId}`)?.cuerpo;
    expect(cuerpo).toBeDefined();
  });
  return cuerpo;
};

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

  // Todo gesto se guarda solo, como el conjunto completo de períodos activos:
  // el backend reparte el peso entero entre ellos (DISTRIBUIR_UNIFORME).
  it("un clic en un mes vacío agrega la barra y guarda sin confirmar", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    await user.click(screen.getByRole("button", { name: "Agregar M1 a Transporte material" }));

    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2, 4],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("arrastrar sobre meses vacíos crea una barra de varios períodos", async () => {
    const peticiones = espiar();
    renderGantt();
    const celda = screen.getByRole("button", { name: "Agregar M1 a Transporte material" });

    fireEvent.pointerDown(celda, { button: 0, pointerId: 1, clientX: 10 });
    fireEvent.pointerMove(celda, { pointerId: 1, clientX: 64 * 2 + 10 });
    fireEvent.pointerUp(celda, { pointerId: 1, clientX: 64 * 2 + 10 });

    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2, 3, 4],
    });
  });

  it("arrastrar una barra la mueve y guarda al soltar", async () => {
    const peticiones = espiar();
    renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" });

    expect(segmento.style.left).toBe("67px");
    fireEvent.pointerDown(segmento, { button: 0, pointerId: 1, clientX: 0 });
    fireEvent.pointerMove(segmento, { pointerId: 1, clientX: -64 });
    expect(segmento.style.left).toBe("3px");
    fireEvent.pointerUp(segmento, { pointerId: 1, clientX: -64 });

    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 4],
    });
  });

  it("mueve con las flechas y estira con Mayús+flecha", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();
    const segmento = screen.getByRole("button", { name: "Segmento 1–3 de Excavación a máquina" });

    segmento.focus();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");

    expect(await cuerpoDe(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2, 3, 4],
    });
  });

  it("une una barra con la anterior desde el clic derecho (M2 y M4 → M2–M4)", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    fireEvent.contextMenu(screen.getByTestId(`segmento-${ACTIVIDAD_3}-4-4`), { clientX: 10 });
    await user.click(await screen.findByRole("menuitem", { name: /unir con la barra anterior/i }));

    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [2, 3, 4],
    });
  });

  it("corta una barra en el mes del clic derecho (M1–M3 → M1 y M3)", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    // JSDOM pone la barra en x=0: el clic a 64+10 px cae en su segundo mes.
    fireEvent.contextMenu(screen.getByTestId(`segmento-${ACTIVIDAD_1}-1-3`), {
      clientX: 64 + 10,
    });
    await user.click(await screen.findByRole("menuitem", { name: "Cortar en M2" }));

    expect(await cuerpoDe(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 3],
    });
  });

  // DISTRIBUIR_UNIFORME rechaza la lista vacía: quitar la última barra es
  // reemplazar el mapa por uno vacío.
  it("eliminar la única barra manda un mapa vacío, no una lista vacía", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    fireEvent.contextMenu(screen.getByTestId(`segmento-${ACTIVIDAD_1}-1-3`), { clientX: 10 });
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar barra" }));

    expect(await cuerpoDe(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: {},
    });
  });

  it("si el guardado falla lo anuncia y vuelve a la programación del servidor", async () => {
    server.use(
      http.patch(`${API}/cronogramas/:id/actividades/:actId`, () =>
        HttpResponse.json({ codigo: "validacion", mensaje: "No" }, { status: 400 }),
      ),
    );
    const { user } = renderGantt();

    await user.click(screen.getByRole("button", { name: "Agregar M1 a Transporte material" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo guardar/i);
    expect(screen.queryByTestId(`segmento-${ACTIVIDAD_3}-1-2`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`segmento-${ACTIVIDAD_3}-2-2`)).toBeInTheDocument();
  });

  // El mes que el usuario fijó (distinto al resto) sobrevive a los gestos: sólo
  // se reparten entre sí los meses libres.
  it("al agregar un mes conserva el valor fijado y reparte el resto", async () => {
    const gantt = structuredClone(cronogramaVistasFixture.gantt);
    const fijar = (capitulos: GanttBloqueResponse["capitulos"]) =>
      capitulos.forEach((c) => {
        c.rubros.forEach((r) => {
          if (r.actividad?.id === ACTIVIDAD_3) {
            r.actividad.avancePorPeriodo = { "2": asDecimal("7.0000"), "4": asDecimal("3.8108") };
          }
        });
        fijar(c.subcapitulos);
      });
    fijar(gantt.capitulos);
    const peticiones = espiar();
    const { user } = renderGantt(gantt);

    await user.click(screen.getByRole("button", { name: "Agregar M1 a Transporte material" }));

    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "1": "1.9054", "2": "7.0000", "4": "1.9054" },
    });
  });

  it("«Editar peso» fija el mes y reparte el resto entre los demás", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    fireEvent.contextMenu(screen.getByTestId(`segmento-${ACTIVIDAD_1}-1-3`), { clientX: 10 });
    await user.click(await screen.findByRole("menuitem", { name: /editar peso de M1/i }));
    const dialogo = await screen.findByRole("dialog");
    const campo = within(dialogo).getByRole("textbox", { name: /en número/i });
    await user.clear(campo);
    await user.type(campo, "50");
    await user.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    // Excavación pesa 10.8108: la mitad en M1 y el resto a partes iguales.
    expect(await cuerpoDe(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "1": "5.4054", "2": "2.7027", "3": "2.7027" },
    });
  });

  // Con guardado automático un toast por gesto sería spam: el aviso es un
  // spinner y un check pequeños junto al botón de descarga.
  it("doble clic sobre un mes de la barra abre el editor de peso de ese mes", async () => {
    renderGantt();

    // JSDOM pone la barra en x=0: 64+10 px cae en su segundo mes.
    fireEvent.doubleClick(screen.getByTestId(`segmento-${ACTIVIDAD_1}-1-3`), { clientX: 64 + 10 });

    expect(
      await screen.findByRole("dialog", { name: /peso de M2 en «Excavación a máquina»/i }),
    ).toBeInTheDocument();
  });

  it("doble clic sobre un mes vacío lo agrega y abre su editor de peso", async () => {
    const peticiones = espiar();
    const { user } = renderGantt();

    await user.dblClick(screen.getByRole("button", { name: "Agregar M1 a Transporte material" }));

    expect(
      await screen.findByRole("dialog", { name: /peso de M1 en «Transporte material»/i }),
    ).toBeInTheDocument();
    expect(await cuerpoDe(peticiones, ACTIVIDAD_3)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2, 4],
    });
  });

  it("indica el guardado con un spinner y un check, sin toasts", async () => {
    vi.mocked(toast.success).mockClear();
    const { user } = renderGantt();

    await user.click(screen.getByRole("button", { name: "Agregar M1 a Transporte material" }));
    await user.click(screen.getByRole("button", { name: "Agregar M4 a Excavación a máquina" }));

    expect(screen.getByText("Guardando…")).toBeInTheDocument();
    expect(await screen.findByText("Cambios guardados", {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Cambios guardados")).not.toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("con actividades pendientes, la etiqueta las lista y la descarga queda apagada", async () => {
    server.use(
      http.get(`${API}/documentos/cronograma/:id/preflight`, () =>
        HttpResponse.json(preflightBloqueadoFixture),
      ),
    );
    const { user } = renderGantt();

    const descarga = await screen.findByRole("button", {
      name: /descargar cronograma: no disponible, 1 actividad por asignar/i,
    });
    expect(descarga).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "1 actividad por asignar" }));
    expect(
      await screen.findByText(/falta asignar en el cronograma 1 actividad/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excavación a máquina" }));
    expect(document.getElementById(`gantt-actividad-${ACTIVIDAD_1}`)).toHaveClass(
      "bg-advertencia/20",
    );
  });

  it("sin pendientes, la descarga es un icono que ofrece los formatos", async () => {
    const { user } = renderGantt();

    await user.click(await screen.findByRole("button", { name: "Descargar cronograma" }));

    expect(await screen.findByRole("button", { name: /excel/i })).toBeEnabled();
    expect(screen.queryByText(/por asignar/i)).not.toBeInTheDocument();
  });

  it("agrega la barra resumen de un capítulo como la unión de los segmentos de sus actividades", () => {
    renderGantt();

    // Capítulo 1 agrupa la excavación (1-3, vía subcapítulo 1.1) y el
    // transporte (2-2 y 4-4, directo): la barra resumen va de 1 a 4.
    const filaCapitulo1 = screen.getByText("Obras preliminares").closest("tr")!;
    const barrasCapitulo = within(filaCapitulo1).getAllByTestId("barra-resumen");
    expect(barrasCapitulo).toHaveLength(1);
    expect(barrasCapitulo[0]).toHaveStyle({ left: "3px", width: "250px" });

    // Peso agregado: 10.8108 (excavación, vía subcapítulo 1.1) +
    // 10.8108 (transporte, directo) = 21.6216, mostrado con 2 decimales.
    // El rubro 1.1.2 no suma: no tiene actividad.
    expect(within(filaCapitulo1).getByText("21.62 %")).toBeInTheDocument();

    // El rubro sin actividad no muestra ninguna barra.
    const filaSinActividad = screen.getByText(/Sin actividad/).closest("tr")!;
    expect(within(filaSinActividad).queryAllByTestId("barra-resumen")).toHaveLength(0);
  });

  // Defecto real: si ningún hijo trabajaba en un mes, la barra del capítulo
  // se partía en dos en vez de ir del primer al último mes con actividad.
  it("la barra resumen no se parte en un mes en que ningún hijo trabaja", () => {
    const gantt = structuredClone(cronogramaVistasFixture.gantt);
    const conSegmentos = (a: ActividadCronogramaResponse | null) => {
      if (a?.id === ACTIVIDAD_1) a.segmentos = [{ inicio: 1, fin: 1 }];
      if (a?.id === ACTIVIDAD_3) a.segmentos = [{ inicio: 4, fin: 4 }];
    };
    const recorrer = (capitulos: GanttBloqueResponse["capitulos"]) =>
      capitulos.forEach((c) => {
        c.rubros.forEach((r) => conSegmentos(r.actividad));
        recorrer(c.subcapitulos);
      });
    recorrer(gantt.capitulos);
    renderGantt(gantt);

    const filaCapitulo1 = screen.getByText("Obras preliminares").closest("tr")!;
    const barras = within(filaCapitulo1).getAllByTestId("barra-resumen");
    expect(barras).toHaveLength(1);
    expect(barras[0]).toHaveStyle({ left: "3px", width: "250px" });
  });

  it("no duplica la fila de un rubro que ya tiene actividad con barra editable", () => {
    renderGantt();

    // Sólo debe existir una fila con el ítem "1.2.1": la de la actividad
    // (con su barra editable), no una fila de rubro repetida sin ella.
    expect(screen.getAllByText("1.2.1")).toHaveLength(1);
    const filaRubroConActividad = screen.getByText("1.2.1").closest("tr")!;
    expect(
      within(filaRubroConActividad).getByTestId(`segmento-${ACTIVIDAD_3}-2-2`),
    ).toBeInTheDocument();
    expect(within(filaRubroConActividad).queryAllByTestId("barra-resumen")).toHaveLength(0);
  });
});
