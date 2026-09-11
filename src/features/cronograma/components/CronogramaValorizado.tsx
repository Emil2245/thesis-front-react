import type { CSSProperties, ReactElement } from "react";
import type {
  CapituloCronogramaResponse,
  PeriodoValorizadoResponse,
  RubroCronogramaResponse,
  UnidadTiempo,
  ValorizadoBloqueResponse,
} from "@/api/contract";
import { etiquetaPeriodo } from "./etiquetaPeriodo";

const PERIOD_WIDTH = 96;
const IDENTITY_WIDTHS = {
  item: 88,
  descripcion: 280,
  unidad: 72,
  cantidad: 112,
  precioUnitario: 128,
  precioTotal: 128,
  montoValorizado: 128,
} as const;
const BASE_COLUMN_COUNT = Object.keys(IDENTITY_WIDTHS).length;
const TABLE_MIN_WIDTH = Object.values(IDENTITY_WIDTHS).reduce((total, width) => total + width, 0);

type CronogramaValorizadoProps = {
  valorizado: ValorizadoBloqueResponse;
  unidadTiempo: UnidadTiempo;
};

type Resumen = {
  clave: string;
  etiqueta: string;
  valor: (periodo: PeriodoValorizadoResponse) => string;
};

const RESUMENES: Resumen[] = [
  {
    clave: "porcentaje-parcial",
    etiqueta: "Porcentaje parcial",
    valor: (periodo) => periodo.porcentajeParcial,
  },
  {
    clave: "porcentaje-acumulado",
    etiqueta: "Porcentaje acumulado",
    valor: (periodo) => periodo.porcentajeAcumulado,
  },
  {
    clave: "monto-parcial",
    etiqueta: "Monto parcial",
    valor: (periodo) => periodo.montoParcial,
  },
  {
    clave: "monto-acumulado",
    etiqueta: "Monto acumulado",
    valor: (periodo) => periodo.montoAcumulado,
  },
];

function indentacion(nivel: number): CSSProperties {
  return { paddingLeft: `${12 + nivel * 16}px` };
}

function tieneRubros(capitulos: CapituloCronogramaResponse[]): boolean {
  return capitulos.some(
    (capitulo) => capitulo.rubros.length > 0 || tieneRubros(capitulo.subcapitulos),
  );
}

function montoDelPeriodo(rubro: RubroCronogramaResponse, periodo: number) {
  return rubro.montoPorPeriodo?.[String(periodo)] ?? "—";
}

function celdasEstructurales(periodos: PeriodoValorizadoResponse[]) {
  return periodos.map((periodo) => (
    <td key={periodo.periodo} className="border-l px-2 py-2 text-right text-muted-foreground">
      —
    </td>
  ));
}

function filaCapitulo(
  capitulo: CapituloCronogramaResponse,
  periodos: PeriodoValorizadoResponse[],
  nivel: number,
): ReactElement[] {
  return [
    <tr
      key={`capitulo-valorizado-${capitulo.id}`}
      data-level={nivel}
      data-row-kind="capitulo"
      className="border-t bg-muted/20"
    >
      <th
        scope="row"
        className="sticky left-0 z-20 border-r bg-muted/20 px-3 py-2 text-left font-semibold"
        style={{ width: IDENTITY_WIDTHS.item }}
      >
        <span
          style={indentacion(nivel)}
          className="inline-block font-mono text-xs text-muted-foreground"
        >
          {capitulo.item}
        </span>
      </th>
      <td
        className="sticky z-20 border-r bg-muted/20 px-3 py-2 font-semibold"
        style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
      >
        <span style={indentacion(nivel)} className="inline-block">
          {capitulo.descripcion}
        </span>
      </td>
      <td colSpan={BASE_COLUMN_COUNT - 2} className="px-3 py-2 text-muted-foreground">
        —
      </td>
      {celdasEstructurales(periodos)}
    </tr>,
    ...capitulo.subcapitulos.flatMap((hijo) => filaCapitulo(hijo, periodos, nivel + 1)),
    ...capitulo.rubros.flatMap((rubro) => filaRubro(rubro, periodos, nivel + 1)),
  ];
}

function filaRubro(
  rubro: RubroCronogramaResponse,
  periodos: PeriodoValorizadoResponse[],
  nivel: number,
): ReactElement[] {
  return [
    <tr
      key={`rubro-valorizado-${rubro.id}`}
      data-level={nivel}
      data-row-kind="rubro"
      className="border-t"
    >
      <th
        scope="row"
        className="sticky left-0 z-20 border-r bg-background px-3 py-2 text-left font-normal"
        style={{ width: IDENTITY_WIDTHS.item }}
      >
        <span
          style={indentacion(nivel)}
          className="inline-block font-mono text-xs text-muted-foreground"
        >
          {rubro.item}
        </span>
      </th>
      <td
        className="sticky z-20 border-r bg-background px-3 py-2"
        style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
      >
        <span style={indentacion(nivel)} className="inline-block">
          {rubro.descripcion}
          {rubro.actividad && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              Actividad {rubro.actividad.codigo}
            </span>
          )}
        </span>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{rubro.unidad}</td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{rubro.cantidad}</td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
        {rubro.precioUnitario}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">{rubro.precioTotal}</td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
        {rubro.montoTotal ?? "—"}
      </td>
      {periodos.map((periodo) => (
        <td
          key={periodo.periodo}
          data-periodo={periodo.periodo}
          className="border-l px-2 py-2 text-right font-mono text-xs tabular-nums"
        >
          {montoDelPeriodo(rubro, periodo.periodo)}
        </td>
      ))}
    </tr>,
  ];
}

function filasDeCapitulos(
  capitulos: CapituloCronogramaResponse[],
  periodos: PeriodoValorizadoResponse[],
): ReactElement[] {
  return capitulos.flatMap((capitulo) => filaCapitulo(capitulo, periodos, 0));
}

function filasDeResumen(periodos: PeriodoValorizadoResponse[]) {
  return RESUMENES.map((resumen) => (
    <tr
      key={resumen.clave}
      data-testid={`resumen-${resumen.clave}`}
      className="border-t bg-muted/30"
    >
      <th
        scope="row"
        colSpan={BASE_COLUMN_COUNT}
        className="sticky left-0 z-20 border-r bg-muted/30 px-3 py-2 text-left text-xs font-medium"
        style={{ width: TABLE_MIN_WIDTH }}
      >
        {resumen.etiqueta}
      </th>
      {periodos.map((periodo) => (
        <td
          key={periodo.periodo}
          className="border-l px-2 py-2 text-right font-mono text-xs tabular-nums"
        >
          {resumen.valor(periodo)}
        </td>
      ))}
    </tr>
  ));
}

export function CronogramaValorizado({ valorizado, unidadTiempo }: CronogramaValorizadoProps) {
  const { periodos, capitulos, totales } = valorizado;
  const hayRubros = tieneRubros(capitulos);
  const filas = periodos.length > 0 && hayRubros ? filasDeCapitulos(capitulos, periodos) : [];

  return (
    <section aria-labelledby="cronograma-valorizado-titulo" className="space-y-3">
      <h2 id="cronograma-valorizado-titulo" className="text-base font-semibold">
        Cronograma valorizado
      </h2>

      {periodos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay períodos valorizados para mostrar.
        </p>
      ) : !hayRubros ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay rubros valorizados para mostrar.
        </p>
      ) : (
        <div className="max-h-[min(70vh,42rem)] overflow-auto rounded-lg border">
          <table
            className="border-collapse text-sm"
            style={{ minWidth: TABLE_MIN_WIDTH + periodos.length * PERIOD_WIDTH }}
          >
            <caption className="sr-only">
              Matriz del cronograma valorizado por rubro y período
            </caption>
            <colgroup>
              <col style={{ width: IDENTITY_WIDTHS.item }} />
              <col style={{ width: IDENTITY_WIDTHS.descripcion }} />
              <col style={{ width: IDENTITY_WIDTHS.unidad }} />
              <col style={{ width: IDENTITY_WIDTHS.cantidad }} />
              <col style={{ width: IDENTITY_WIDTHS.precioUnitario }} />
              <col style={{ width: IDENTITY_WIDTHS.precioTotal }} />
              <col style={{ width: IDENTITY_WIDTHS.montoValorizado }} />
              <col span={periodos.length} style={{ width: PERIOD_WIDTH }} />
            </colgroup>
            <thead className="sticky top-0 z-30 bg-muted/95">
              <tr className="border-b">
                <th
                  scope="col"
                  className="sticky left-0 z-40 border-r bg-muted/95 px-3 py-2 text-left font-medium"
                  style={{ width: IDENTITY_WIDTHS.item }}
                >
                  Ítem
                </th>
                <th
                  scope="col"
                  className="sticky z-40 border-r bg-muted/95 px-3 py-2 text-left font-medium"
                  style={{ left: IDENTITY_WIDTHS.item, width: IDENTITY_WIDTHS.descripcion }}
                >
                  Descripción
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Unidad
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Cantidad
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Precio unitario
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Precio total
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Monto valorizado
                </th>
                {periodos.map((periodo) => (
                  <th
                    key={periodo.periodo}
                    scope="col"
                    className="min-w-24 border-l px-2 py-2 text-right font-medium"
                  >
                    {etiquetaPeriodo(unidadTiempo, periodo.periodo)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas}
              {filasDeResumen(periodos)}
            </tbody>
          </table>
        </div>
      )}

      <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Avance final</dt>
          <dd className="font-mono text-sm tabular-nums">{totales.avanceFinalPorcentaje}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monto total general</dt>
          <dd className="font-mono text-sm tabular-nums">{totales.montoTotalGeneral}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Porcentaje de cierre</dt>
          <dd className="font-mono text-sm tabular-nums">{totales.porcentajeCierre}</dd>
        </div>
      </dl>
    </section>
  );
}
