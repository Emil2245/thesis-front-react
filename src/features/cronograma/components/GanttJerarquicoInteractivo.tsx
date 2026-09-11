import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import type {
  ActividadCronogramaResponse,
  CapituloCronogramaResponse,
  GanttBloqueResponse,
  RubroCronogramaResponse,
  SegmentoResponse,
} from "@/api/contract";
import { ApiError } from "@/api/problem";
import { formatearPuntosPorcentaje, type Decimal } from "@/lib/decimal";
import { useProgramarActividad } from "../hooks/useCronograma";
import { etiquetaPeriodo } from "./etiquetaPeriodo";

const PERIOD_WIDTH = 64;
const IDENTITY_WIDTHS = {
  item: 96,
  descripcion: 300,
  unidad: 88,
  peso: 96,
} as const;
const IDENTITY_WIDTH = Object.values(IDENTITY_WIDTHS).reduce((total, width) => total + width, 0);

type GanttJerarquicoInteractivoProps = {
  gantt: GanttBloqueResponse;
  cronogramaId: string;
  presupuestoId: string;
  onClickActividad?: (actividad: ActividadCronogramaResponse) => void;
};

type Fila =
  | {
      tipo: "capitulo";
      clave: string;
      capitulo: CapituloCronogramaResponse;
      nivel: number;
      tieneHijos: boolean;
    }
  | {
      tipo: "rubro";
      clave: string;
      rubro: RubroCronogramaResponse;
      nivel: number;
    }
  | {
      tipo: "actividad";
      clave: string;
      actividad: ActividadCronogramaResponse;
      nivel: number;
    };

type OperacionSegmento = "MOVER_SEGMENTO" | "REDIMENSIONAR_SEGMENTO";

type VistaPrevia = {
  actividad: ActividadCronogramaResponse;
  segmento: SegmentoResponse;
  operacion: OperacionSegmento;
  nuevoInicio: number;
  nuevoFin: number;
};

type Arrastre = {
  actividad: ActividadCronogramaResponse;
  segmento: SegmentoResponse;
  operacion: "mover" | "inicio" | "fin";
  inicioX: number;
  numeroPeriodos: number;
};

function periodosDe(numeroPeriodos: number) {
  return Array.from({ length: numeroPeriodos }, (_, index) => index + 1);
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function segmentosIguales(a: VistaPrevia, b: { actividadId: string; segmento: SegmentoResponse }) {
  return (
    a.actividad.id === b.actividadId &&
    a.segmento.inicio === b.segmento.inicio &&
    a.segmento.fin === b.segmento.fin
  );
}

function idsDeCapitulos(capitulos: CapituloCronogramaResponse[]): string[] {
  return capitulos.flatMap((capitulo) => [capitulo.id, ...idsDeCapitulos(capitulo.subcapitulos)]);
}

function filasDe(
  capitulos: CapituloCronogramaResponse[],
  expandidos: Set<string>,
  nivel = 0,
): Fila[] {
  return capitulos.flatMap((capitulo) => {
    const tieneHijos = capitulo.subcapitulos.length > 0 || capitulo.rubros.length > 0;
    const filas: Fila[] = [
      {
        tipo: "capitulo",
        clave: `capitulo-${capitulo.id}`,
        capitulo,
        nivel,
        tieneHijos,
      },
    ];
    if (!expandidos.has(capitulo.id)) return filas;

    const descendientes = filasDe(capitulo.subcapitulos, expandidos, nivel + 1);
    for (const rubro of capitulo.rubros) {
      filas.push({ tipo: "rubro", clave: `rubro-${rubro.id}`, rubro, nivel: nivel + 1 });
      if (rubro.actividad) {
        filas.push({
          tipo: "actividad",
          clave: `actividad-${rubro.actividad.id}`,
          actividad: rubro.actividad,
          nivel: nivel + 2,
        });
      }
    }
    return [...filas, ...descendientes];
  });
}

function indentacion(nivel: number): CSSProperties {
  return { paddingLeft: `${12 + nivel * 16}px` };
}

function rangoValido(vista: VistaPrevia, numeroPeriodos: number) {
  const { nuevoInicio, nuevoFin, segmento, operacion } = vista;
  if (
    !Number.isInteger(nuevoInicio) ||
    !Number.isInteger(nuevoFin) ||
    nuevoInicio < 1 ||
    nuevoFin > numeroPeriodos ||
    nuevoFin < nuevoInicio
  ) {
    return false;
  }
  if (operacion === "MOVER_SEGMENTO") {
    return (
      nuevoInicio !== segmento.inicio && nuevoInicio - segmento.inicio === nuevoFin - segmento.fin
    );
  }
  return nuevoInicio !== segmento.inicio || nuevoFin !== segmento.fin;
}

function mensajeRango(vista: VistaPrevia | null, numeroPeriodos: number) {
  if (!vista) return null;
  if (!rangoValido(vista, numeroPeriodos)) {
    return vista.operacion === "MOVER_SEGMENTO"
      ? `El movimiento debe conservar la longitud y permanecer entre 1 y ${numeroPeriodos}.`
      : `El nuevo rango debe estar entre 1 y ${numeroPeriodos}, con el final después del inicio.`;
  }
  return null;
}

function nombreSegmento(segmento: SegmentoResponse) {
  return `${segmento.inicio}–${segmento.fin}`;
}

function TimelineGrid({
  periodos,
  segmentos = [],
  actividad,
  unidadTiempo,
  onSegmentClick,
  onSegmentKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: {
  periodos: number[];
  segmentos?: SegmentoResponse[];
  actividad?: ActividadCronogramaResponse;
  unidadTiempo: GanttBloqueResponse["cronograma"]["unidadTiempo"];
  onSegmentClick?: (actividad: ActividadCronogramaResponse, segmento: SegmentoResponse) => void;
  onSegmentKeyDown?: (
    event: ReactKeyboardEvent<HTMLDivElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
  ) => void;
  onPointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
  ) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onHandlePointerDown?: (
    event: ReactPointerEvent<HTMLButtonElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    extremo: "inicio" | "fin",
  ) => void;
  onHandlePointerMove?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className="relative grid min-h-12"
      style={{
        gridTemplateColumns: `repeat(${periodos.length}, ${PERIOD_WIDTH}px)`,
        minWidth: periodos.length * PERIOD_WIDTH,
      }}
    >
      {periodos.map((periodo) => (
        <div key={periodo} className="border-l border-dashed border-border/50" aria-hidden="true" />
      ))}
      {actividad &&
        segmentos.map((segmento, index) => {
          const left = (segmento.inicio - 1) * PERIOD_WIDTH + 3;
          const width = (segmento.fin - segmento.inicio + 1) * PERIOD_WIDTH - 6;
          const etiqueta = `Segmento ${nombreSegmento(segmento)} de ${actividad.descripcion}`;
          return (
            <div
              key={`${segmento.inicio}-${segmento.fin}-${index}`}
              role="button"
              tabIndex={0}
              aria-label={etiqueta}
              data-testid={`segmento-${actividad.id}-${segmento.inicio}-${segmento.fin}`}
              className="absolute top-2 z-10 flex h-8 items-center rounded bg-foreground/75 px-2 text-xs text-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left, width }}
              onClick={() => onSegmentClick?.(actividad, segmento)}
              onKeyDown={(event) => onSegmentKeyDown?.(event, actividad, segmento)}
              onPointerDown={(event) => onPointerDown?.(event, actividad, segmento)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              <span className="truncate">{nombreSegmento(segmento)}</span>
              <button
                type="button"
                aria-label={`Ajustar extremo inicial del segmento ${nombreSegmento(segmento)}`}
                className="absolute -left-1 h-7 w-2 cursor-ew-resize rounded-l bg-foreground/80 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onHandlePointerDown?.(event, actividad, segmento, "inicio");
                }}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerCancel}
              />
              <button
                type="button"
                aria-label={`Ajustar extremo final del segmento ${nombreSegmento(segmento)}`}
                className="absolute -right-1 h-7 w-2 cursor-ew-resize rounded-r bg-foreground/80 opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onHandlePointerDown?.(event, actividad, segmento, "fin");
                }}
                onPointerMove={onHandlePointerMove}
                onPointerUp={onHandlePointerUp}
                onPointerCancel={onHandlePointerCancel}
              />
            </div>
          );
        })}
      {actividad &&
        segmentos.map((segmento, index) => (
          <span key={`sr-${segmento.inicio}-${segmento.fin}-${index}`} className="sr-only">
            {etiquetaPeriodo(unidadTiempo, segmento.inicio)} a{" "}
            {etiquetaPeriodo(unidadTiempo, segmento.fin)}
          </span>
        ))}
    </div>
  );
}

function SummaryTimeline({ periodos, valores }: { periodos: number[]; valores: Decimal[] }) {
  return (
    <div
      className="grid min-h-12"
      style={{
        gridTemplateColumns: `repeat(${periodos.length}, ${PERIOD_WIDTH}px)`,
        minWidth: periodos.length * PERIOD_WIDTH,
      }}
    >
      {periodos.map((periodo, index) => (
        <div
          key={periodo}
          className="flex items-center justify-center border-l border-dashed border-border/50 px-1 text-[10px] font-mono tabular-nums"
        >
          {formatearPuntosPorcentaje(valores[index], 2)}
        </div>
      ))}
    </div>
  );
}

export function GanttJerarquicoInteractivo({
  gantt,
  cronogramaId,
  presupuestoId,
  onClickActividad,
}: GanttJerarquicoInteractivoProps) {
  const { cronograma, capitulos } = gantt;
  const periodos = periodosDe(cronograma.numeroPeriodos);
  const [expandidos, setExpandidos] = useState<Set<string>>(
    () => new Set(idsDeCapitulos(capitulos)),
  );
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null);
  const [anuncio, setAnuncio] = useState("");
  const arrastre = useRef<Arrastre | null>(null);
  const movimientoRealizado = useRef(false);
  const omitirClick = useRef<{ actividadId: string; inicio: number; fin: number } | null>(null);
  const { mutateAsync: programar } = useProgramarActividad(cronogramaId, presupuestoId);

  const filas = filasDe(capitulos, expandidos);
  const errorVistaPrevia = mensajeRango(vistaPrevia, cronograma.numeroPeriodos);

  const alternarCapitulo = (id: string) => {
    setExpandidos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  };

  const iniciarVistaPrevia = (
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    operacion: OperacionSegmento,
    nuevoInicio: number,
    nuevoFin: number,
  ) => {
    setAnuncio("");
    setVistaPrevia({ actividad, segmento, operacion, nuevoInicio, nuevoFin });
  };

  const iniciarMovimiento = (
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    delta: number,
    origen: Pick<SegmentoResponse, "inicio" | "fin"> = segmento,
  ) => {
    const permitido = limitar(delta, 1 - origen.inicio, cronograma.numeroPeriodos - origen.fin);
    iniciarVistaPrevia(
      actividad,
      segmento,
      "MOVER_SEGMENTO",
      origen.inicio + permitido,
      origen.fin + permitido,
    );
  };

  const iniciarRedimension = (
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    extremo: "inicio" | "fin",
    delta: number,
  ) => {
    const nuevoInicio =
      extremo === "inicio" ? limitar(segmento.inicio + delta, 1, segmento.fin) : segmento.inicio;
    const nuevoFin =
      extremo === "fin"
        ? limitar(segmento.fin + delta, segmento.inicio, cronograma.numeroPeriodos)
        : segmento.fin;
    iniciarVistaPrevia(actividad, segmento, "REDIMENSIONAR_SEGMENTO", nuevoInicio, nuevoFin);
  };

  const confirmarVistaPrevia = async () => {
    if (!vistaPrevia) return;
    if (errorVistaPrevia) {
      setAnuncio(errorVistaPrevia);
      return;
    }

    const body =
      vistaPrevia.operacion === "MOVER_SEGMENTO"
        ? {
            operacion: "MOVER_SEGMENTO" as const,
            inicio: vistaPrevia.segmento.inicio,
            fin: vistaPrevia.segmento.fin,
            delta: vistaPrevia.nuevoInicio - vistaPrevia.segmento.inicio,
          }
        : {
            operacion: "REDIMENSIONAR_SEGMENTO" as const,
            inicio: vistaPrevia.segmento.inicio,
            fin: vistaPrevia.segmento.fin,
            nuevoInicio: vistaPrevia.nuevoInicio,
            nuevoFin: vistaPrevia.nuevoFin,
          };

    try {
      await programar({ actividadId: vistaPrevia.actividad.id, body });
      setVistaPrevia(null);
      setAnuncio("");
    } catch (error) {
      setVistaPrevia(null);
      setAnuncio(
        error instanceof ApiError && error.is("segmento-solapado")
          ? "El destino se solapa con otro segmento de la actividad. Se descartó la vista previa."
          : "No se pudo programar el segmento. Se descartó la vista previa.",
      );
    }
  };

  const manejarTecladoSegmento = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const origen =
        vistaPrevia?.operacion === "MOVER_SEGMENTO" &&
        segmentosIguales(vistaPrevia, { actividadId: actividad.id, segmento })
          ? { inicio: vistaPrevia.nuevoInicio, fin: vistaPrevia.nuevoFin }
          : segmento;
      iniciarMovimiento(actividad, segmento, event.key === "ArrowRight" ? 1 : -1, origen);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (vistaPrevia && segmentosIguales(vistaPrevia, { actividadId: actividad.id, segmento })) {
        void confirmarVistaPrevia();
      } else {
        setVistaPrevia(null);
        onClickActividad?.(actividad);
      }
    }
  };

  const iniciarArrastre = (
    event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    operacion: Arrastre["operacion"],
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    arrastre.current = {
      actividad,
      segmento,
      operacion,
      inicioX: event.clientX,
      numeroPeriodos: cronograma.numeroPeriodos,
    };
    movimientoRealizado.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // JSDOM no implementa pointer capture; el navegador sí lo usa durante drag.
    }
  };

  const moverArrastre = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    const actual = arrastre.current;
    if (!actual) return;
    const delta = Math.round((event.clientX - actual.inicioX) / PERIOD_WIDTH);
    if (delta === 0) return;
    movimientoRealizado.current = true;
    if (actual.operacion === "mover") {
      iniciarMovimiento(actual.actividad, actual.segmento, delta);
    } else {
      iniciarRedimension(actual.actividad, actual.segmento, actual.operacion, delta);
    }
  };

  const finalizarArrastre = (event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (!arrastre.current) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // JSDOM no implementa pointer capture.
    }
    if (movimientoRealizado.current && arrastre.current) {
      omitirClick.current = {
        actividadId: arrastre.current.actividad.id,
        inicio: arrastre.current.segmento.inicio,
        fin: arrastre.current.segmento.fin,
      };
    }
    arrastre.current = null;
  };

  const cancelarClickTrasDrag = (actividadId: string, segmento?: SegmentoResponse) => {
    const pendiente = omitirClick.current;
    if (!pendiente || !segmento) return false;
    omitirClick.current = null;
    return (
      pendiente.actividadId === actividadId &&
      pendiente.inicio === segmento.inicio &&
      pendiente.fin === segmento.fin
    );
  };

  return (
    <section aria-labelledby="gantt-jerarquico-titulo" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 id="gantt-jerarquico-titulo" className="text-base font-semibold">
            Gantt jerárquico
          </h2>
          <p className="text-sm text-muted-foreground">
            {cronograma.unidadTiempo === "SEMANA" ? "Semanas" : "Meses"} ordinales; las barras
            representan segmentos del servidor.
          </p>
        </div>
      </div>

      {anuncio && (
        <p role="alert" aria-live="assertive">
          {anuncio}
        </p>
      )}

      {vistaPrevia && (
        <section
          aria-label="Vista previa del segmento"
          aria-live="polite"
          aria-atomic="true"
          className="rounded-lg border border-dashed p-3 text-sm"
        >
          <p className="font-medium">
            Vista previa: {vistaPrevia.operacion === "MOVER_SEGMENTO" ? "mover" : "redimensionar"}{" "}
            segmento {nombreSegmento(vistaPrevia.segmento)} → {vistaPrevia.nuevoInicio}–
            {vistaPrevia.nuevoFin}
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Nuevo inicio</span>
              <input
                aria-label="Nuevo inicio"
                className="h-8 w-24 rounded-md border bg-background px-2 font-mono"
                type="number"
                min={1}
                max={cronograma.numeroPeriodos}
                value={vistaPrevia.nuevoInicio}
                onChange={(event) =>
                  setVistaPrevia((actual) =>
                    actual ? { ...actual, nuevoInicio: Number(event.target.value) } : actual,
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Nuevo fin</span>
              <input
                aria-label="Nuevo fin"
                className="h-8 w-24 rounded-md border bg-background px-2 font-mono"
                type="number"
                min={1}
                max={cronograma.numeroPeriodos}
                value={vistaPrevia.nuevoFin}
                onChange={(event) =>
                  setVistaPrevia((actual) =>
                    actual ? { ...actual, nuevoFin: Number(event.target.value) } : actual,
                  )
                }
              />
            </label>
            <button
              type="button"
              className="h-8 rounded-md bg-primary px-3 text-primary-foreground"
              disabled={!!errorVistaPrevia}
              onClick={() => void confirmarVistaPrevia()}
            >
              Confirmar {vistaPrevia.operacion === "MOVER_SEGMENTO" ? "mover" : "redimensionar"}{" "}
              segmento
            </button>
            <button
              type="button"
              className="h-8 rounded-md border px-3"
              onClick={() => {
                setVistaPrevia(null);
                setAnuncio("");
              }}
            >
              Cancelar
            </button>
          </div>
          {errorVistaPrevia && (
            <p role="alert" className="mt-2 text-destructive">
              {errorVistaPrevia}
            </p>
          )}
        </section>
      )}

      <div className="max-h-[min(70vh,42rem)] overflow-auto rounded-lg border">
        <table
          className="border-collapse text-sm"
          style={{ minWidth: IDENTITY_WIDTH + periodos.length * PERIOD_WIDTH }}
        >
          <caption className="sr-only">
            Gantt jerárquico por capítulos, rubros, actividades y períodos
          </caption>
          <colgroup>
            <col style={{ width: IDENTITY_WIDTHS.item }} />
            <col style={{ width: IDENTITY_WIDTHS.descripcion }} />
            <col style={{ width: IDENTITY_WIDTHS.unidad }} />
            <col style={{ width: IDENTITY_WIDTHS.peso }} />
            <col span={periodos.length} style={{ width: PERIOD_WIDTH }} />
          </colgroup>
          <thead className="sticky top-0 z-30 bg-muted/95">
            <tr className="border-b">
              <th
                scope="col"
                className="sticky left-0 z-40 border-r px-3 py-2 text-left font-medium"
                style={{ width: IDENTITY_WIDTHS.item }}
              >
                Ítem
              </th>
              <th
                scope="col"
                className="sticky z-40 border-r px-3 py-2 text-left font-medium"
                style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
              >
                Descripción
              </th>
              <th
                scope="col"
                className="sticky z-40 border-r px-3 py-2 text-left font-medium"
                style={{
                  left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                  width: IDENTITY_WIDTHS.unidad,
                }}
              >
                Unidad
              </th>
              <th
                scope="col"
                className="sticky z-40 border-r px-3 py-2 text-right font-medium"
                style={{
                  left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion + IDENTITY_WIDTHS.unidad,
                  width: IDENTITY_WIDTHS.peso,
                }}
              >
                Peso (%)
              </th>
              <th scope="col" colSpan={periodos.length} className="p-0">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${periodos.length}, ${PERIOD_WIDTH}px)`,
                    minWidth: periodos.length * PERIOD_WIDTH,
                  }}
                >
                  {periodos.map((periodo) => (
                    <span key={periodo} className="border-l px-2 py-2 text-center font-medium">
                      {etiquetaPeriodo(cronograma.unidadTiempo, periodo)}
                    </span>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              if (fila.tipo === "capitulo") {
                const { capitulo } = fila;
                const expandido = expandidos.has(capitulo.id);
                return (
                  <tr key={fila.clave} data-level={fila.nivel} className="border-b bg-muted/20">
                    <th
                      scope="row"
                      className="sticky left-0 z-20 border-r bg-muted/20 px-3 py-2 text-left font-semibold"
                      style={{ width: IDENTITY_WIDTHS.item }}
                    >
                      <div className="flex items-center gap-1" style={indentacion(fila.nivel)}>
                        {fila.tieneHijos ? (
                          <button
                            type="button"
                            aria-label={`${expandido ? "Contraer" : "Expandir"} capítulo ${capitulo.item}`}
                            aria-expanded={expandido}
                            className="rounded p-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => alternarCapitulo(capitulo.id)}
                          >
                            {expandido ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          </button>
                        ) : (
                          <span className="size-5" aria-hidden="true" />
                        )}
                        <span className="font-mono text-xs text-muted-foreground">
                          {capitulo.item}
                        </span>
                      </div>
                    </th>
                    <td
                      className="sticky z-20 border-r bg-muted/20 px-3 py-2 font-semibold"
                      style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                    >
                      {capitulo.descripcion}
                    </td>
                    <td
                      className="sticky z-20 border-r bg-muted/20 px-3 py-2"
                      style={{
                        left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                        width: IDENTITY_WIDTHS.unidad,
                      }}
                    />
                    <td
                      className="sticky z-20 border-r bg-muted/20 px-3 py-2"
                      style={{
                        left:
                          IDENTITY_WIDTHS.item +
                          IDENTITY_WIDTHS.descripcion +
                          IDENTITY_WIDTHS.unidad,
                        width: IDENTITY_WIDTHS.peso,
                      }}
                    />
                    <td colSpan={periodos.length} className="p-0">
                      <TimelineGrid periodos={periodos} unidadTiempo={cronograma.unidadTiempo} />
                    </td>
                  </tr>
                );
              }

              if (fila.tipo === "rubro") {
                const { rubro } = fila;
                return (
                  <tr key={fila.clave} data-level={fila.nivel} className="border-b">
                    <th
                      scope="row"
                      className="sticky left-0 z-20 border-r bg-background px-3 py-2 text-left font-medium"
                      style={{ width: IDENTITY_WIDTHS.item }}
                    >
                      <span
                        style={indentacion(fila.nivel)}
                        className="inline-block font-mono text-xs text-muted-foreground"
                      >
                        {rubro.item}
                      </span>
                    </th>
                    <td
                      className="sticky z-20 border-r bg-background px-3 py-2"
                      style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                    >
                      <span style={indentacion(fila.nivel)} className="inline-block">
                        {rubro.descripcion}
                        {!rubro.actividad && (
                          <span className="ml-2 text-xs text-muted-foreground">Sin actividad</span>
                        )}
                      </span>
                    </td>
                    <td
                      className="sticky z-20 border-r bg-background px-3 py-2 text-muted-foreground"
                      style={{
                        left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                        width: IDENTITY_WIDTHS.unidad,
                      }}
                    >
                      {rubro.unidad}
                    </td>
                    <td
                      className="sticky z-20 border-r bg-background px-3 py-2 text-right text-muted-foreground"
                      style={{
                        left:
                          IDENTITY_WIDTHS.item +
                          IDENTITY_WIDTHS.descripcion +
                          IDENTITY_WIDTHS.unidad,
                        width: IDENTITY_WIDTHS.peso,
                      }}
                    >
                      —
                    </td>
                    <td colSpan={periodos.length} className="p-0">
                      <TimelineGrid periodos={periodos} unidadTiempo={cronograma.unidadTiempo} />
                    </td>
                  </tr>
                );
              }

              const { actividad } = fila;
              const manejarClick = (
                actividadActual: ActividadCronogramaResponse,
                segmento?: SegmentoResponse,
              ) => {
                if (cancelarClickTrasDrag(actividadActual.id, segmento)) return;
                setVistaPrevia(null);
                onClickActividad?.(actividadActual);
              };
              return (
                <tr
                  key={fila.clave}
                  data-level={fila.nivel}
                  className="group border-b hover:bg-muted/20"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-20 border-r bg-background px-3 py-2 text-left font-normal"
                    style={{ width: IDENTITY_WIDTHS.item }}
                  >
                    <span
                      style={indentacion(fila.nivel)}
                      className="inline-block font-mono text-xs text-muted-foreground"
                    >
                      {actividad.item}
                    </span>
                  </th>
                  <td
                    className="sticky z-20 border-r bg-background px-3 py-2"
                    style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                  >
                    <button
                      type="button"
                      className="max-w-full text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => manejarClick(actividad)}
                    >
                      <span style={indentacion(fila.nivel)} className="inline-block">
                        {actividad.descripcion}
                      </span>
                    </button>
                  </td>
                  <td
                    className="sticky z-20 border-r bg-background px-3 py-2 text-muted-foreground"
                    style={{
                      left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                      width: IDENTITY_WIDTHS.unidad,
                    }}
                  >
                    {actividad.unidad}
                  </td>
                  <td
                    className="sticky z-20 border-r bg-background px-3 py-2 text-right font-mono text-xs tabular-nums"
                    style={{
                      left:
                        IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion + IDENTITY_WIDTHS.unidad,
                      width: IDENTITY_WIDTHS.peso,
                    }}
                  >
                    {formatearPuntosPorcentaje(actividad.pesoPonderado)}
                    <details className="mt-1 text-left">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground">
                        Acciones de segmento
                      </summary>
                      <div className="mt-1 flex min-w-48 flex-col gap-1 rounded border bg-background p-1 text-xs">
                        {actividad.segmentos.map((segmento) => (
                          <div
                            key={`${segmento.inicio}-${segmento.fin}`}
                            className="flex flex-col gap-1"
                          >
                            <span>Acciones del segmento {nombreSegmento(segmento)}</span>
                            <button
                              type="button"
                              className="rounded border px-1 py-0.5 text-left hover:bg-muted"
                              onClick={() => iniciarMovimiento(actividad, segmento, -1)}
                            >
                              Mover segmento {nombreSegmento(segmento)} una posición a la izquierda
                            </button>
                            <button
                              type="button"
                              className="rounded border px-1 py-0.5 text-left hover:bg-muted"
                              onClick={() => iniciarMovimiento(actividad, segmento, 1)}
                            >
                              Mover segmento {nombreSegmento(segmento)} una posición a la derecha
                            </button>
                            <button
                              type="button"
                              className="rounded border px-1 py-0.5 text-left hover:bg-muted"
                              onClick={() => iniciarRedimension(actividad, segmento, "fin", 1)}
                            >
                              Redimensionar final del segmento {nombreSegmento(segmento)} una
                              posición
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td colSpan={periodos.length} className="p-0">
                    <TimelineGrid
                      periodos={periodos}
                      segmentos={actividad.segmentos}
                      actividad={actividad}
                      unidadTiempo={cronograma.unidadTiempo}
                      onSegmentClick={manejarClick}
                      onSegmentKeyDown={(event, actividadActual, segmento) => {
                        if (cancelarClickTrasDrag(actividadActual.id, segmento)) return;
                        manejarTecladoSegmento(event, actividadActual, segmento);
                      }}
                      onPointerDown={(event, actividadActual, segmento) =>
                        iniciarArrastre(event, actividadActual, segmento, "mover")
                      }
                      onPointerMove={moverArrastre}
                      onPointerUp={finalizarArrastre}
                      onPointerCancel={finalizarArrastre}
                      onHandlePointerDown={(event, actividadActual, segmento, extremo) =>
                        iniciarArrastre(event, actividadActual, segmento, extremo)
                      }
                      onHandlePointerMove={moverArrastre}
                      onHandlePointerUp={finalizarArrastre}
                      onHandlePointerCancel={finalizarArrastre}
                    />
                  </td>
                </tr>
              );
            })}
            {(["Avance por período", "Avance acumulado"] as const).map((titulo, index) => (
              <tr key={titulo} className="border-b bg-muted/30">
                <th
                  scope="row"
                  colSpan={4}
                  className="sticky left-0 z-20 border-r bg-muted/30 px-3 py-2 text-left text-xs font-medium"
                  style={{ width: IDENTITY_WIDTH }}
                >
                  {titulo}
                </th>
                <td colSpan={periodos.length} className="p-0">
                  <SummaryTimeline
                    periodos={periodos}
                    valores={index === 0 ? cronograma.avancePorPeriodo : cronograma.avanceAcumulado}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
