import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2,
  PlusIcon,
} from "lucide-react";

import type {
  ActividadCronogramaResponse,
  CapituloCronogramaResponse,
  GanttBloqueResponse,
  RubroCronogramaResponse,
  SegmentoResponse,
} from "@/api/contract";
import { qk } from "@/api/queryKeys";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  aUnidadesPorcentaje,
  cuantizar,
  esCero,
  formatearPuntosPorcentaje,
  ESCALA_PORCENTAJE,
  type Decimal,
} from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useProgramarActividad } from "../hooks/useCronograma";
import { DescargaCronograma } from "./DescargaCronograma";
import { DialogoRepartoMes } from "./DialogoRepartoMes";
import { etiquetaPeriodo } from "./etiquetaPeriodo";
import {
  agregarRango,
  cuerpoProgramacion,
  deltaPermitido,
  desplazarFijos,
  detectarFijos,
  eliminarSegmento,
  fijosEn,
  mismosFijos,
  mismosPeriodos,
  moverSegmento,
  periodosDeSegmentos,
  quitarPeriodo,
  redimensionarSegmento,
  segmentosDePeriodos,
  unirSegmentos,
  type Fijos,
} from "./programacionGantt";

// Ancho mínimo legible de una columna de período; se ensancha para llenar el
// contenedor cuando sobra espacio (ver `useAnchoPeriodo`).
const PERIOD_MIN_WIDTH = 64;
const IDENTITY_WIDTHS = {
  item: 64,
  descripcion: 230,
  peso: 80,
} as const;
const IDENTITY_WIDTH = Object.values(IDENTITY_WIDTHS).reduce((total, width) => total + width, 0);

type GanttJerarquicoInteractivoProps = {
  gantt: GanttBloqueResponse;
  cronogramaId: string;
  presupuestoId: string;
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

/**
 * Un gesto de puntero en curso. `base` son los períodos visibles al empezar:
 * cada movimiento recalcula el resultado desde ahí, no desde el anterior.
 */
type Arrastre =
  | {
      tipo: "segmento";
      actividad: ActividadCronogramaResponse;
      segmento: SegmentoResponse;
      operacion: "mover" | "inicio" | "fin";
      inicioX: number;
      base: number[];
    }
  | {
      tipo: "crear";
      actividad: ActividadCronogramaResponse;
      ancla: number;
      izquierda: number;
      base: number[];
    };

type VistaArrastre = { actividadId: string; periodos: number[] };

type ResultadoArrastre = { periodos: number[]; fijos?: Fijos };

// Indicador de guardado: el spinner dura al menos esto (un parpadeo de 80 ms
// no se lee) y el check se queda lo justo para verse. Nada de toasts: con el
// guardado automático saldría uno por gesto.
const SPINNER_MINIMO_MS = 800;
const CHECK_VISIBLE_MS = 1200;

type Indicador = "guardando" | "guardado" | null;

// Fuera del componente: sólo se llama desde manejadores, nunca al renderizar.
const ahora = () => Date.now();

type ErrorGuardado = { mensaje: string } | null;

function periodosDe(numeroPeriodos: number) {
  return Array.from({ length: numeroPeriodos }, (_, index) => index + 1);
}

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function idsDeCapitulos(capitulos: CapituloCronogramaResponse[]): string[] {
  return capitulos.flatMap((capitulo) => [capitulo.id, ...idsDeCapitulos(capitulo.subcapitulos)]);
}

/** Capítulos que hay que abrir para que se vea la fila de la actividad. */
function ancestrosDe(capitulos: CapituloCronogramaResponse[], actividadId: string): string[] {
  for (const capitulo of capitulos) {
    if (capitulo.rubros.some((rubro) => rubro.actividad?.id === actividadId)) return [capitulo.id];
    const dentro = ancestrosDe(capitulo.subcapitulos, actividadId);
    if (dentro.length > 0) return [capitulo.id, ...dentro];
  }
  return [];
}

function actividadesDeRubro(rubro: RubroCronogramaResponse): ActividadCronogramaResponse[] {
  return rubro.actividad ? [rubro.actividad] : [];
}

function actividadesDeCapitulo(
  capitulo: CapituloCronogramaResponse,
): ActividadCronogramaResponse[] {
  return [
    ...capitulo.rubros.flatMap(actividadesDeRubro),
    ...capitulo.subcapitulos.flatMap(actividadesDeCapitulo),
  ];
}

/**
 * Barra resumen de un grupo: una sola barra desde el primer período con
 * actividad de sus descendientes hasta el último —como la tarea resumen de
 * MS Project—. Un mes en que ningún hijo trabaja no abre un hueco: el
 * capítulo sigue en ejecución entre su inicio y su fin.
 */
function segmentoResumen(periodos: number[]): SegmentoResponse[] {
  if (periodos.length === 0) return [];
  return [{ inicio: Math.min(...periodos), fin: Math.max(...periodos) }];
}

/**
 * Peso agregado de un grupo (capítulo o subcapítulo): la suma del peso
 * ponderado de todas sus actividades descendientes — cuánto representa ese
 * grupo, de punta a punta, sobre el total del proyecto.
 */
function pesoAgregado(actividades: ActividadCronogramaResponse[]): number {
  const suma = actividades.reduce((total, actividad) => total + Number(actividad.pesoPonderado), 0);
  return cuantizar(suma, ESCALA_PORCENTAJE);
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
      // Un rubro con actividad se pinta como una sola fila (la de la actividad,
      // con su barra editable): mostrar además la fila de rubro sería un
      // duplicado idéntico sin la barra interactiva.
      filas.push(
        rubro.actividad
          ? {
              tipo: "actividad",
              clave: `actividad-${rubro.actividad.id}`,
              actividad: rubro.actividad,
              nivel: nivel + 1,
            }
          : { tipo: "rubro", clave: `rubro-${rubro.id}`, rubro, nivel: nivel + 1 },
      );
    }
    return [...filas, ...descendientes];
  });
}

/** Indentación de los títulos de capítulo/subcapítulo, según su profundidad. */
function indentacionTitulo(nivel: number): CSSProperties | undefined {
  return nivel === 0 ? undefined : { paddingLeft: `${nivel * 12}px` };
}

function nombreSegmento(segmento: SegmentoResponse) {
  return `${segmento.inicio}–${segmento.fin}`;
}

/**
 * Ancho de columna de período que llena el contenedor cuando sobra espacio
 * (pocos períodos, pantalla ancha) y cae al mínimo legible cuando no alcanza
 * (el contenedor scrollea horizontalmente, como antes).
 */
function useAnchoPeriodo(numeroPeriodos: number) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [anchoDisponible, setAnchoDisponible] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setAnchoDisponible(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setAnchoDisponible(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // MARGEN_SEGURIDAD_PX: colchón mínimo por el redondeo de sub-píxel de
  // `border-collapse` (varía por navegador/DPI). La tabla ya fija su
  // `width` exacto (ver más abajo), así que esto ya no tapa nada grande.
  const MARGEN_SEGURIDAD_PX = 2;
  const anchoPeriodo =
    anchoDisponible == null
      ? PERIOD_MIN_WIDTH
      : Math.max(
          PERIOD_MIN_WIDTH,
          Math.floor(
            (anchoDisponible - IDENTITY_WIDTH - MARGEN_SEGURIDAD_PX) / Math.max(numeroPeriodos, 1),
          ),
        );

  return { scrollerRef, anchoPeriodo };
}

function estiloGrilla(periodos: number[], periodWidth: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${periodos.length}, ${periodWidth}px)`,
    minWidth: periodos.length * periodWidth,
  };
}

type AccionesSegmento = {
  onPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    segmento: SegmentoResponse,
    operacion: "mover" | "inicio" | "fin",
  ) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>, segmento: SegmentoResponse) => void;
  onCortar: (periodo: number) => void;
  onUnir: (anterior: SegmentoResponse, siguiente: SegmentoResponse) => void;
  onEliminar: (segmento: SegmentoResponse) => void;
  onEditar: (periodo: number) => void;
};

/**
 * Línea de tiempo editable de una actividad. Los meses vacíos son botones con
 * una barra fantasma «+» que late al pasar el cursor; las barras se arrastran,
 * se estiran por sus bordes y ofrecen cortar/unir con clic derecho.
 */
function TimelineActividad({
  periodos,
  periodWidth,
  actividad,
  periodosActivos,
  fijos,
  pendiente,
  unidadTiempo,
  onCrearPointerDown,
  onPointerMove,
  onPointerUp,
  onCeldaClick,
  acciones,
}: {
  periodos: number[];
  periodWidth: number;
  actividad: ActividadCronogramaResponse;
  periodosActivos: number[];
  fijos: Fijos;
  pendiente: boolean;
  unidadTiempo: GanttBloqueResponse["cronograma"]["unidadTiempo"];
  onCrearPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, periodo: number) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onCeldaClick: (periodo: number) => void;
  acciones: AccionesSegmento;
}) {
  const activos = new Set(periodosActivos);
  const segmentos = segmentosDePeriodos(periodosActivos);
  // Período bajo el clic derecho: decide si «Cortar aquí» tiene sentido.
  const [periodoMenu, setPeriodoMenu] = useState<number | null>(null);

  const periodoEnPuntero = (event: ReactMouseEvent<HTMLElement>, segmento: SegmentoResponse) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const indice = Math.floor((event.clientX - rect.left) / periodWidth);
    return limitar(segmento.inicio + indice, segmento.inicio, segmento.fin);
  };

  return (
    <div className="relative grid min-h-10" style={estiloGrilla(periodos, periodWidth)}>
      {/* Siempre el mismo elemento por período: si la celda de origen de un
          arrastre cambiara de tipo al activarse, se desmontaría y el navegador
          perdería la captura del puntero a mitad del gesto. */}
      {periodos.map((periodo) => {
        const activo = activos.has(periodo);
        return (
          <button
            key={periodo}
            type="button"
            tabIndex={activo ? -1 : undefined}
            aria-hidden={activo || undefined}
            aria-label={
              activo
                ? undefined
                : `Agregar ${etiquetaPeriodo(unidadTiempo, periodo)} a ${actividad.descripcion}`
            }
            className={cn(
              "group/celda relative min-h-10 touch-none border-l border-dashed border-border/50 outline-none",
              !activo && "cursor-copy",
            )}
            onPointerDown={activo ? undefined : (event) => onCrearPointerDown(event, periodo)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={activo ? undefined : () => onCeldaClick(periodo)}
            // En un mes vacío el primer clic ya crea la barra; el segundo abre
            // el editor de peso de ese mes, igual que sobre una barra.
            onDoubleClick={() => acciones.onEditar(periodo)}
          >
            {!activo && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[3px] top-1.5 flex h-7 items-center justify-center rounded border border-dashed border-foreground/40 bg-foreground/5 text-foreground/70 opacity-0 transition-opacity group-hover/celda:animate-pulse group-hover/celda:opacity-100 group-focus-visible/celda:opacity-100 group-focus-visible/celda:ring-2 group-focus-visible/celda:ring-ring"
              >
                <PlusIcon className="size-4" />
              </span>
            )}
          </button>
        );
      })}
      {segmentos.map((segmento, index) => {
        const left = (segmento.inicio - 1) * periodWidth + 3;
        const width = (segmento.fin - segmento.inicio + 1) * periodWidth - 6;
        const anterior = segmentos[index - 1];
        const siguiente = segmentos[index + 1];
        const etiqueta = `Segmento ${nombreSegmento(segmento)} de ${actividad.descripcion}`;
        const mesesDelSegmento = periodos.slice(segmento.inicio - 1, segmento.fin);
        const puedeCortar =
          periodoMenu !== null && periodoMenu >= segmento.inicio && periodoMenu <= segmento.fin
            ? segmento.fin > segmento.inicio
            : false;
        return (
          // La clave es el índice, no el rango: al mover con el teclado la
          // barra conserva su nodo y, con él, el foco.
          <ContextMenu key={index}>
            <ContextMenuTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={etiqueta}
                aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Delete"
                title={`${etiquetaPeriodo(unidadTiempo, segmento.inicio)}–${etiquetaPeriodo(unidadTiempo, segmento.fin)} · arrastra para mover, estira los bordes, clic derecho para cortar o unir`}
                data-testid={`segmento-${actividad.id}-${segmento.inicio}-${segmento.fin}`}
                className={cn(
                  "group/seg absolute top-1.5 z-10 flex h-7 cursor-grab touch-none items-stretch rounded text-[10px] text-background shadow-sm outline-none transition-[left,width] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
                  pendiente ? "bg-foreground/55" : "bg-foreground/75",
                )}
                style={{ left, width }}
                onPointerDown={(event) => acciones.onPointerDown(event, segmento, "mover")}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(event) => acciones.onKeyDown(event, segmento)}
                onContextMenu={(event) => setPeriodoMenu(periodoEnPuntero(event, segmento))}
                // Atajo del menú «Editar peso»: doble clic sobre el mes.
                onDoubleClick={(event) => acciones.onEditar(periodoEnPuntero(event, segmento))}
              >
                {/* El reparto lo hace el servidor; mientras guarda no hay cifra que enseñar. */}
                {mesesDelSegmento.map((periodo) => (
                  <span
                    key={periodo}
                    className={cn(
                      "flex flex-1 items-center justify-center truncate font-mono tabular-nums",
                      fijos[periodo] !== undefined && "font-bold underline underline-offset-2",
                    )}
                    title={fijos[periodo] !== undefined ? "Valor fijado a mano" : undefined}
                  >
                    {pendiente
                      ? "…"
                      : formatearPuntosPorcentaje(actividad.avancePorPeriodo[String(periodo)], 2)}
                  </span>
                ))}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -left-1 w-2.5 cursor-ew-resize rounded-l bg-foreground opacity-0 transition-opacity group-hover/seg:opacity-100"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    acciones.onPointerDown(event, segmento, "inicio");
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -right-1 w-2.5 cursor-ew-resize rounded-r bg-foreground opacity-0 transition-opacity group-hover/seg:opacity-100"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    acciones.onPointerDown(event, segmento, "fin");
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              {periodoMenu !== null &&
                periodoMenu >= segmento.inicio &&
                periodoMenu <= segmento.fin && (
                  <>
                    <ContextMenuItem onSelect={() => acciones.onEditar(periodoMenu)}>
                      Editar peso de {etiquetaPeriodo(unidadTiempo, periodoMenu)}…
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
              {anterior && (
                <ContextMenuItem onSelect={() => acciones.onUnir(anterior, segmento)}>
                  Unir con la barra anterior ({nombreSegmento(anterior)} → {anterior.inicio}–
                  {segmento.fin})
                </ContextMenuItem>
              )}
              {siguiente && (
                <ContextMenuItem onSelect={() => acciones.onUnir(segmento, siguiente)}>
                  Unir con la barra siguiente ({nombreSegmento(siguiente)} → {segmento.inicio}–
                  {siguiente.fin})
                </ContextMenuItem>
              )}
              {puedeCortar && periodoMenu !== null && (
                <ContextMenuItem onSelect={() => acciones.onCortar(periodoMenu)}>
                  {periodoMenu > segmento.inicio && periodoMenu < segmento.fin
                    ? `Cortar en ${etiquetaPeriodo(unidadTiempo, periodoMenu)}`
                    : `Quitar ${etiquetaPeriodo(unidadTiempo, periodoMenu)}`}
                </ContextMenuItem>
              )}
              {(anterior || siguiente || puedeCortar) && <ContextMenuSeparator />}
              <ContextMenuItem variant="destructive" onSelect={() => acciones.onEliminar(segmento)}>
                Eliminar barra
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
      {segmentos.map((segmento) => (
        <span key={`sr-${segmento.inicio}-${segmento.fin}`} className="sr-only">
          {etiquetaPeriodo(unidadTiempo, segmento.inicio)} a{" "}
          {etiquetaPeriodo(unidadTiempo, segmento.fin)}
        </span>
      ))}
    </div>
  );
}

function TimelineResumen({
  periodos,
  periodWidth,
  segmentos,
  etiqueta,
}: {
  periodos: number[];
  periodWidth: number;
  segmentos: SegmentoResponse[];
  etiqueta: string;
}) {
  return (
    <div className="relative grid min-h-10" style={estiloGrilla(periodos, periodWidth)}>
      {periodos.map((periodo) => (
        <div key={periodo} className="border-l border-dashed border-border/50" aria-hidden="true" />
      ))}
      {segmentos.map((segmento, index) => {
        const left = (segmento.inicio - 1) * periodWidth + 3;
        const width = (segmento.fin - segmento.inicio + 1) * periodWidth - 6;
        return (
          <div
            key={`${segmento.inicio}-${segmento.fin}-${index}`}
            aria-hidden="true"
            data-testid="barra-resumen"
            className="absolute top-2.5 z-10 h-5 rounded bg-foreground/40 transition-[left,width] duration-150"
            style={{ left, width }}
          />
        );
      })}
      <span className="sr-only">
        {etiqueta}:{" "}
        {segmentos.length > 0
          ? segmentos.map((segmento) => nombreSegmento(segmento)).join(", ")
          : "sin actividad programada"}
      </span>
    </div>
  );
}

/**
 * Barra de porcentaje animada: el relleno transiciona en ancho cada vez que
 * `valor` cambia (al montar o tras guardar), en vez de saltar de golpe.
 */
function BarraPorcentaje({ valor, claro }: { valor: number; claro?: boolean }) {
  const porcentaje = Math.min(100, Math.max(0, valor));
  return (
    // El <progress> nativo no se puede animar ni colorear de forma
    // consistente entre navegadores; div + role="progressbar" es el patrón
    // estándar (Radix/shadcn lo usan igual) para una barra a medida.
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        claro ? "bg-background/60" : "bg-muted",
      )}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="progressbar"
      aria-valuenow={Math.round(porcentaje)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${porcentaje}%` }}
      />
    </div>
  );
}

/**
 * Rojo–amarillo–verde para 0–100 %: el matiz HSL recorre 0→120 en línea
 * recta, así que el amarillo (60) cae justo en el 50 % sin tabla de paradas.
 */
function colorAvance(porcentaje: number): string {
  const acotado = Math.min(100, Math.max(0, porcentaje));
  return `hsl(${acotado * 1.2}deg 75% 45% / 0.35)`;
}

/**
 * Un solo `linear-gradient` para toda la fila en vez de un color plano por
 * celda: la parada de cada período va en su centro, así el color se funde
 * con el de sus vecinos en vez de cortar en seco en cada borde de columna.
 */
function gradienteAvance(valores: Decimal[]): string {
  if (valores.length === 0) return "transparent";
  const paradas = valores.map((valor, indice) => {
    const posicion = ((indice + 0.5) / valores.length) * 100;
    return `${colorAvance(Number(valor))} ${posicion}%`;
  });
  return `linear-gradient(to right, ${paradas.join(", ")})`;
}

function SummaryTimeline({
  periodos,
  periodWidth,
  valores,
  coloreado,
}: {
  periodos: number[];
  periodWidth: number;
  valores: Decimal[];
  coloreado?: boolean;
}) {
  return (
    <div
      className="grid min-h-10"
      style={{
        ...estiloGrilla(periodos, periodWidth),
        backgroundImage: coloreado ? gradienteAvance(valores) : undefined,
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
}: GanttJerarquicoInteractivoProps) {
  const { cronograma, capitulos } = gantt;
  const numeroPeriodos = cronograma.numeroPeriodos;
  const periodos = periodosDe(numeroPeriodos);
  const { scrollerRef, anchoPeriodo } = useAnchoPeriodo(numeroPeriodos);
  const [expandidos, setExpandidos] = useState<Set<string>>(
    () => new Set(idsDeCapitulos(capitulos)),
  );
  // Programación optimista: lo que el usuario ya decidió y aún no volvió del
  // servidor. Se descarta cuando llega la proyección nueva o si falla.
  const [borradores, setBorradores] = useState<Record<string, number[]>>({});
  // Meses fijados a mano en esta sesión. El backend sólo guarda valores, así
  // que sin esto el fijo se deduce de ellos (`detectarFijos`).
  const [fijosSesion, setFijosSesion] = useState<Record<string, Fijos>>({});
  const [vistaArrastre, setVistaArrastre] = useState<VistaArrastre | null>(null);
  const [error, setError] = useState<ErrorGuardado>(null);
  const [edicion, setEdicion] = useState<{
    actividad: ActividadCronogramaResponse;
    periodo: number;
  } | null>(null);
  const [resaltada, setResaltada] = useState<string | null>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const ultimoArrastre = useRef<ResultadoArrastre | null>(null);
  const omitirClick = useRef(false);
  const colas = useRef(new Map<string, Promise<unknown>>());
  const versiones = useRef(new Map<string, number>());
  const enCurso = useRef(0);
  const aviso = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inicioGuardado = useRef(0);
  const [indicador, setIndicador] = useState<Indicador>(null);
  const queryClient = useQueryClient();
  const { mutateAsync: programar } = useProgramarActividad(cronogramaId, presupuestoId);

  const filas = filasDe(capitulos, expandidos);
  const unidad = cronograma.unidadTiempo === "SEMANA" ? "semana" : "mes";

  const periodosGuardados = (actividad: ActividadCronogramaResponse) =>
    borradores[actividad.id] ?? periodosDeSegmentos(actividad.segmentos);

  const periodosVisibles = (actividad: ActividadCronogramaResponse) =>
    vistaArrastre?.actividadId === actividad.id
      ? vistaArrastre.periodos
      : periodosGuardados(actividad);

  const fijosDe = (actividad: ActividadCronogramaResponse) =>
    fijosSesion[actividad.id] ?? detectarFijos(actividad.avancePorPeriodo);

  const alternarCapitulo = (id: string) => {
    setExpandidos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
  };

  // Un aviso pendiente no debe saltar después de salir del Gantt.
  useEffect(() => () => clearTimeout(aviso.current), []);

  const cerrarIndicador = (exito: boolean) => {
    if (enCurso.current > 0) return;
    if (!exito) {
      setIndicador(null);
      return;
    }
    const espera = Math.max(0, SPINNER_MINIMO_MS - (ahora() - inicioGuardado.current));
    aviso.current = setTimeout(() => {
      setIndicador("guardado");
      aviso.current = setTimeout(() => setIndicador(null), CHECK_VISIBLE_MS);
    }, espera);
  };

  /**
   * Guardado automático. Las peticiones de una misma actividad se encolan
   * para que lleguen en orden: cada una manda el conjunto completo, así que
   * la última en llegar es la que manda. Los meses fijos que sigan activos
   * conservan su valor; el resto se reparte (ver `programacionGantt`).
   */
  const guardar = (
    actividad: ActividadCronogramaResponse,
    siguientes: number[],
    fijosPedidos?: Fijos,
  ) => {
    const id = actividad.id;
    const fijos = fijosEn(fijosPedidos ?? fijosDe(actividad), siguientes);
    if (
      mismosPeriodos(periodosGuardados(actividad), siguientes) &&
      mismosFijos(fijosEn(fijosDe(actividad), siguientes), fijos)
    ) {
      return;
    }
    const version = (versiones.current.get(id) ?? 0) + 1;
    versiones.current.set(id, version);
    setBorradores((actuales) => ({ ...actuales, [id]: siguientes }));
    setFijosSesion((actuales) => ({ ...actuales, [id]: fijos }));
    setError(null);
    if (enCurso.current === 0) inicioGuardado.current = ahora();
    enCurso.current += 1;
    clearTimeout(aviso.current);
    setIndicador("guardando");

    const cuerpo = cuerpoProgramacion(
      siguientes,
      aUnidadesPorcentaje(actividad.pesoPonderado),
      fijos,
    );
    const previa = colas.current.get(id) ?? Promise.resolve();
    const tarea = previa.then(() => programar({ actividadId: id, body: cuerpo }));
    colas.current.set(
      id,
      tarea.catch(() => undefined),
    );

    const cerrar = async (fallo: ErrorGuardado) => {
      await queryClient.invalidateQueries({ queryKey: qk.cronogramaVistas(cronogramaId) });
      enCurso.current -= 1;
      if (versiones.current.get(id) === version) {
        setBorradores(({ [id]: _descartado, ...resto }) => resto);
        if (fallo) {
          setFijosSesion(({ [id]: _descartado, ...resto }) => resto);
          setError(fallo);
        }
      }
      cerrarIndicador(!fallo);
    };
    tarea.then(
      () => cerrar(null),
      () =>
        cerrar({
          mensaje: `No se pudo guardar «${actividad.descripcion}»; se restauró la programación del servidor.`,
        }),
    );
  };

  /** Desde la lista de pendientes: abre su capítulo, la centra y la resalta. */
  const irAActividad = (actividad: ActividadCronogramaResponse) => {
    setExpandidos((actuales) => new Set([...actuales, ...ancestrosDe(capitulos, actividad.id)]));
    setResaltada(actividad.id);
    setTimeout(() => {
      const fila = document.getElementById(`gantt-actividad-${actividad.id}`);
      fila?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      fila
        ?.querySelector<HTMLElement>("button[aria-label^='Agregar'], [role='button']")
        ?.focus({ preventScroll: true });
    }, 0);
    setTimeout(() => setResaltada((actual) => (actual === actividad.id ? null : actual)), 2500);
  };

  const capturar = (event: ReactPointerEvent<HTMLElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // JSDOM no implementa pointer capture; el navegador sí lo usa durante drag.
    }
  };

  const iniciarArrastreSegmento = (
    event: ReactPointerEvent<HTMLElement>,
    actividad: ActividadCronogramaResponse,
    segmento: SegmentoResponse,
    operacion: "mover" | "inicio" | "fin",
  ) => {
    if (event.button !== 0) return;
    omitirClick.current = false;
    arrastre.current = {
      tipo: "segmento",
      actividad,
      segmento,
      operacion,
      inicioX: event.clientX,
      base: periodosVisibles(actividad),
    };
    ultimoArrastre.current = null;
    capturar(event);
  };

  const iniciarCreacion = (
    event: ReactPointerEvent<HTMLButtonElement>,
    actividad: ActividadCronogramaResponse,
    periodo: number,
  ) => {
    if (event.button !== 0) return;
    omitirClick.current = false;
    const grilla = event.currentTarget.parentElement;
    const izquierda = grilla ? grilla.getBoundingClientRect().left : 0;
    arrastre.current = {
      tipo: "crear",
      actividad,
      ancla: periodo,
      izquierda,
      base: periodosVisibles(actividad),
    };
    ultimoArrastre.current = null;
    capturar(event);
  };

  const moverArrastre = (event: ReactPointerEvent<HTMLElement>) => {
    const actual = arrastre.current;
    if (!actual) return;
    let resultado: ResultadoArrastre;
    if (actual.tipo === "crear") {
      const periodo = limitar(
        Math.floor((event.clientX - actual.izquierda) / anchoPeriodo) + 1,
        1,
        numeroPeriodos,
      );
      if (periodo === actual.ancla && !ultimoArrastre.current) return;
      resultado = { periodos: agregarRango(actual.base, actual.ancla, periodo) };
    } else {
      const delta = Math.round((event.clientX - actual.inicioX) / anchoPeriodo);
      if (delta === 0 && !ultimoArrastre.current) return;
      if (actual.operacion === "mover") {
        const permitido = deltaPermitido(actual.segmento, delta, numeroPeriodos);
        resultado = {
          periodos: moverSegmento(actual.base, actual.segmento, delta, numeroPeriodos),
          // Un mes fijado viaja con su barra.
          fijos: desplazarFijos(fijosDe(actual.actividad), actual.segmento, permitido),
        };
      } else {
        resultado = {
          periodos: redimensionarSegmento(
            actual.base,
            actual.segmento,
            actual.operacion,
            delta,
            numeroPeriodos,
          ),
        };
      }
    }
    ultimoArrastre.current = resultado;
    setVistaArrastre({ actividadId: actual.actividad.id, periodos: resultado.periodos });
  };

  const finalizarArrastre = (event: ReactPointerEvent<HTMLElement>) => {
    const actual = arrastre.current;
    if (!actual) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // JSDOM no implementa pointer capture.
    }
    arrastre.current = null;
    const resultado = ultimoArrastre.current;
    ultimoArrastre.current = null;
    setVistaArrastre(null);
    if (resultado) {
      // Hubo arrastre: el clic que el navegador dispara al soltar no debe
      // volver a agregar el período de origen.
      omitirClick.current = true;
      guardar(actual.actividad, resultado.periodos, resultado.fijos);
    }
  };

  const accionesDe = (actividad: ActividadCronogramaResponse): AccionesSegmento => {
    const actuales = () => periodosGuardados(actividad);
    return {
      onPointerDown: (event, segmento, operacion) =>
        iniciarArrastreSegmento(event, actividad, segmento, operacion),
      onKeyDown: (event, segmento) => {
        const base = actuales();
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? 1 : -1;
          if (event.shiftKey) {
            guardar(actividad, redimensionarSegmento(base, segmento, "fin", delta, numeroPeriodos));
          } else {
            const permitido = deltaPermitido(segmento, delta, numeroPeriodos);
            guardar(
              actividad,
              moverSegmento(base, segmento, delta, numeroPeriodos),
              desplazarFijos(fijosDe(actividad), segmento, permitido),
            );
          }
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          guardar(actividad, eliminarSegmento(base, segmento));
        } else if (event.key === "Enter") {
          event.preventDefault();
          setEdicion({ actividad, periodo: segmento.inicio });
        }
      },
      onCortar: (periodo) => guardar(actividad, quitarPeriodo(actuales(), periodo)),
      onUnir: (anterior, siguiente) =>
        guardar(actividad, unirSegmentos(actuales(), anterior, siguiente)),
      onEliminar: (segmento) => guardar(actividad, eliminarSegmento(actuales(), segmento)),
      onEditar: (periodo) => setEdicion({ actividad, periodo }),
    };
  };

  return (
    <section aria-labelledby="gantt-jerarquico-titulo" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="gantt-jerarquico-titulo" className="text-base font-semibold">
            Gantt jerárquico
          </h2>
          <p className="text-sm text-muted-foreground">
            Haz clic o arrastra sobre un {unidad} vacío para agregar una barra; arrastra la barra
            para moverla y sus bordes para estirarla o reducirla. Doble clic en un {unidad} fija su
            peso; con clic derecho también puedes cortar o unir. El resto del peso se reparte solo y
            todo se guarda al soltar.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <output aria-live="polite" className="flex size-5 items-center justify-center">
            {indicador === "guardando" && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            {indicador === "guardado" && (
              <CheckIcon
                className="size-4 text-exito-texto animate-in fade-in zoom-in-50 duration-300"
                aria-hidden="true"
              />
            )}
            <span className="sr-only">
              {indicador === "guardando"
                ? "Guardando…"
                : indicador === "guardado"
                  ? "Cambios guardados"
                  : ""}
            </span>
          </output>
          <DescargaCronograma
            presupuestoId={presupuestoId}
            actividades={cronograma.actividades}
            onIrAActividad={irAActividad}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.mensaje}
        </p>
      )}

      {edicion && (
        <DialogoRepartoMes
          onOpenChange={(abierto) => {
            if (!abierto) setEdicion(null);
          }}
          onGuardar={(fijos) => {
            guardar(edicion.actividad, periodosGuardados(edicion.actividad), fijos);
            setEdicion(null);
          }}
          actividad={edicion.actividad}
          periodo={edicion.periodo}
          periodos={periodosGuardados(edicion.actividad)}
          fijos={fijosDe(edicion.actividad)}
          unidadTiempo={cronograma.unidadTiempo}
        />
      )}

      <div ref={scrollerRef} className="max-h-[min(78vh,50rem)] overflow-auto rounded-lg border">
        <table
          className="mx-auto table-fixed border-collapse text-sm select-none"
          // `width` explícito (no `minWidth`): con `table-layout: fixed` y
          // `width: auto`, el navegador usa el ancho del contenedor en vez
          // de la suma real de columnas, así que los anchos declarados dejan
          // de coincidir con lo renderizado y aparece un scroll horizontal
          // fantasma de unos pocos píxeles.
          style={{ width: IDENTITY_WIDTH + periodos.length * anchoPeriodo }}
        >
          <caption className="sr-only">
            Gantt jerárquico por capítulos, rubros, actividades y períodos
          </caption>
          <colgroup>
            <col style={{ width: IDENTITY_WIDTHS.item }} />
            <col style={{ width: IDENTITY_WIDTHS.descripcion }} />
            <col style={{ width: IDENTITY_WIDTHS.peso }} />
            <col span={periodos.length} style={{ width: anchoPeriodo }} />
          </colgroup>
          <thead className="sticky top-0 z-30 bg-muted/95">
            <tr className="border-b">
              <th
                scope="col"
                className="sticky left-0 z-40 border-r bg-muted px-2 py-1.5 text-left font-medium"
                style={{ width: IDENTITY_WIDTHS.item }}
              >
                Ítem
              </th>
              <th
                scope="col"
                className="sticky z-40 border-r bg-muted px-3 py-1.5 text-left font-medium"
                style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
              >
                Descripción
              </th>
              <th
                scope="col"
                className="sticky z-40 border-r bg-muted px-2 py-1.5 text-right font-medium"
                style={{
                  left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                  width: IDENTITY_WIDTHS.peso,
                }}
              >
                Peso (%)
              </th>
              <th scope="col" colSpan={periodos.length} className="p-0">
                <div className="grid" style={estiloGrilla(periodos, anchoPeriodo)}>
                  {periodos.map((periodo) => (
                    <span key={periodo} className="border-l px-2 py-1.5 text-center font-medium">
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
                const actividades = actividadesDeCapitulo(capitulo);
                const peso = pesoAgregado(actividades);
                return (
                  <tr key={fila.clave} data-level={fila.nivel} className="border-b bg-muted/20">
                    <th
                      scope="row"
                      className="sticky left-0 z-20 border-r bg-[color-mix(in_oklab,var(--muted)_20%,var(--background))] px-2 py-1.5 text-left font-semibold"
                      style={{ width: IDENTITY_WIDTHS.item }}
                    >
                      <div className="flex items-center gap-1">
                        {fila.tieneHijos ? (
                          <button
                            type="button"
                            aria-label={`${expandido ? "Contraer" : "Expandir"} capítulo ${capitulo.item}`}
                            aria-expanded={expandido}
                            className="shrink-0 rounded p-0.5 focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => alternarCapitulo(capitulo.id)}
                          >
                            {expandido ? (
                              <ChevronDownIcon className="size-4" aria-hidden="true" />
                            ) : (
                              <ChevronRightIcon className="size-4" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          <span className="size-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                          {capitulo.item}
                        </span>
                      </div>
                    </th>
                    <td
                      className={cn(
                        "sticky z-20 border-r bg-[color-mix(in_oklab,var(--muted)_20%,var(--background))] px-3 py-1.5 font-semibold",
                        fila.nivel > 0 && "text-xs",
                      )}
                      style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                    >
                      <span style={indentacionTitulo(fila.nivel)} className="inline-block">
                        {capitulo.descripcion}
                      </span>
                    </td>
                    <td
                      className="sticky z-20 border-r bg-[color-mix(in_oklab,var(--muted)_20%,var(--background))] px-2 py-1.5"
                      style={{
                        left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                        width: IDENTITY_WIDTHS.peso,
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-right font-mono text-xs font-semibold tabular-nums">
                          {formatearPuntosPorcentaje(peso, 2)}
                        </span>
                        <BarraPorcentaje valor={peso} />
                      </div>
                    </td>
                    <td colSpan={periodos.length} className="p-0">
                      <TimelineResumen
                        periodos={periodos}
                        periodWidth={anchoPeriodo}
                        segmentos={segmentoResumen(actividades.flatMap(periodosVisibles))}
                        etiqueta={`Resumen del capítulo ${capitulo.item}`}
                      />
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
                      className="sticky left-0 z-20 border-r bg-background px-2 py-1.5 text-left font-medium"
                      style={{ width: IDENTITY_WIDTHS.item }}
                    >
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {rubro.item}
                      </span>
                    </th>
                    <td
                      className="sticky z-20 border-r bg-background px-3 py-1.5"
                      style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                    >
                      <span className="inline-block">
                        {rubro.descripcion}
                        <span className="ml-2 text-xs text-muted-foreground">Sin actividad</span>
                      </span>
                    </td>
                    <td
                      className="sticky z-20 border-r bg-background px-2 py-1.5 text-right text-muted-foreground"
                      style={{
                        left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                        width: IDENTITY_WIDTHS.peso,
                      }}
                    >
                      —
                    </td>
                    <td colSpan={periodos.length} className="p-0">
                      <TimelineResumen
                        periodos={periodos}
                        periodWidth={anchoPeriodo}
                        segmentos={[]}
                        etiqueta={`Rubro ${rubro.item} sin actividad`}
                      />
                    </td>
                  </tr>
                );
              }

              const { actividad } = fila;
              return (
                <tr
                  key={fila.clave}
                  id={`gantt-actividad-${actividad.id}`}
                  data-level={fila.nivel}
                  className={cn(
                    "border-b transition-colors duration-700 hover:bg-muted/20",
                    resaltada === actividad.id && "bg-advertencia/20",
                  )}
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-20 border-r bg-background px-2 py-1.5 text-left font-normal"
                    style={{ width: IDENTITY_WIDTHS.item }}
                  >
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {actividad.item}
                    </span>
                  </th>
                  <td
                    className="sticky z-20 border-r bg-background px-3 py-1.5 text-xs"
                    style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                  >
                    <span style={indentacionTitulo(fila.nivel - 1)} className="inline-block">
                      {actividad.descripcion}
                      {/* La desviación la calcula el servidor: distinta de cero es
                          justo lo que bloquea la exportación. */}
                      {!esCero(actividad.desviacion) && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-advertencia/15 px-1.5 text-xs text-advertencia-texto">
                          <AlertTriangleIcon className="size-3" aria-hidden="true" />
                          Sin asignar
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    className="sticky z-20 border-r bg-background px-2 py-1.5"
                    style={{
                      left: IDENTITY_WIDTHS.item + IDENTITY_WIDTHS.descripcion,
                      width: IDENTITY_WIDTHS.peso,
                    }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-right font-mono text-xs tabular-nums">
                        {formatearPuntosPorcentaje(actividad.pesoPonderado, 2)}
                      </span>
                      <BarraPorcentaje valor={Number(actividad.pesoPonderado)} />
                    </div>
                  </td>
                  <td colSpan={periodos.length} className="p-0">
                    <TimelineActividad
                      periodos={periodos}
                      periodWidth={anchoPeriodo}
                      actividad={actividad}
                      periodosActivos={periodosVisibles(actividad)}
                      fijos={fijosEn(fijosDe(actividad), periodosVisibles(actividad))}
                      pendiente={
                        vistaArrastre?.actividadId === actividad.id ||
                        borradores[actividad.id] !== undefined
                      }
                      unidadTiempo={cronograma.unidadTiempo}
                      onCrearPointerDown={(event, periodo) =>
                        iniciarCreacion(event, actividad, periodo)
                      }
                      onPointerMove={moverArrastre}
                      onPointerUp={finalizarArrastre}
                      onCeldaClick={(periodo) => {
                        if (omitirClick.current) {
                          omitirClick.current = false;
                          return;
                        }
                        guardar(
                          actividad,
                          agregarRango(periodosGuardados(actividad), periodo, periodo),
                        );
                      }}
                      acciones={accionesDe(actividad)}
                    />
                  </td>
                </tr>
              );
            })}
            {(["Avance por período", "Avance acumulado"] as const).map((titulo, index) => (
              <tr key={titulo} className="border-b bg-muted/30">
                <th
                  scope="row"
                  colSpan={3}
                  className="sticky left-0 z-20 border-r bg-[color-mix(in_oklab,var(--muted)_30%,var(--background))] px-3 py-1.5 text-left text-xs font-medium"
                  style={{ width: IDENTITY_WIDTH }}
                >
                  {titulo}
                </th>
                <td colSpan={periodos.length} className="p-0">
                  <SummaryTimeline
                    periodos={periodos}
                    periodWidth={anchoPeriodo}
                    valores={index === 0 ? cronograma.avancePorPeriodo : cronograma.avanceAcumulado}
                    coloreado={index === 1}
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
