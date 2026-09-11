import { useId, useState } from "react";

import type { CurvaSResponse, PuntoCurvaSResponse, UnidadTiempo } from "@/api/contract";
import { formatearMoneda, formatearPuntosPorcentaje } from "@/lib/decimal";
import { etiquetaPeriodo } from "./etiquetaPeriodo";

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 320;
const MARGINS = { top: 24, right: 24, bottom: 52, left: 64 } as const;
const GRID_VALUES = [0, 25, 50, 75, 100] as const;
const MAX_VISIBLE_X_LABELS = 8;

type CurvaSChartProps = {
  curvaS: CurvaSResponse;
  unidadTiempo: UnidadTiempo;
};

type GeometriaPunto = {
  punto: PuntoCurvaSResponse;
  indice: number;
  etiqueta: string;
  x: number;
  y: number;
};

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function xPeriodo(indice: number, total: number) {
  const ancho = VIEWBOX_WIDTH - MARGINS.left - MARGINS.right;
  return total === 1 ? MARGINS.left + ancho / 2 : MARGINS.left + (indice / (total - 1)) * ancho;
}

function yPorcentaje(valor: string) {
  const porcentaje = Number(valor);
  const seguro = Number.isFinite(porcentaje) ? limitar(porcentaje, 0, 100) : 0;
  const alto = VIEWBOX_HEIGHT - MARGINS.top - MARGINS.bottom;
  return MARGINS.top + ((100 - seguro) / 100) * alto;
}

function etiquetaPunto(punto: PuntoCurvaSResponse, unidadTiempo: UnidadTiempo) {
  return etiquetaPeriodo(unidadTiempo, punto.periodo);
}

function seleccionarIndicesDeEje(total: number) {
  if (total <= MAX_VISIBLE_X_LABELS) return Array.from({ length: total }, (_, index) => index);
  const paso = Math.ceil(total / MAX_VISIBLE_X_LABELS);
  const indices = Array.from({ length: total }, (_, index) => index).filter(
    (index) => index % paso === 0,
  );
  if (indices.at(-1) !== total - 1) indices.push(total - 1);
  return indices;
}

function detallePunto(punto: PuntoCurvaSResponse, etiqueta: string) {
  return (
    <section
      aria-label="Detalle del punto seleccionado"
      aria-live="polite"
      className="rounded-lg border bg-muted/20 p-4"
    >
      <h3 className="text-sm font-medium">Detalle del punto</h3>
      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Período</dt>
          <dd className="font-mono tabular-nums">{etiqueta}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Porcentaje acumulado programado</dt>
          <dd className="font-mono tabular-nums">
            {punto.porcentajeAcumulado} · {formatearPuntosPorcentaje(punto.porcentajeAcumulado)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monto acumulado</dt>
          <dd className="font-mono tabular-nums">
            {punto.montoAcumulado} · {formatearMoneda(punto.montoAcumulado)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function tablaAlternativa(puntos: PuntoCurvaSResponse[], unidadTiempo: UnidadTiempo) {
  return (
    <details open className="rounded-lg border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Tabla accesible de datos de Curva S
      </summary>
      <div className="overflow-x-auto border-t">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Valores de programación acumulada por período</caption>
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Período
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Porcentaje parcial
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Porcentaje acumulado
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Monto parcial
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Monto acumulado
              </th>
            </tr>
          </thead>
          <tbody>
            {puntos.map((punto) => (
              <tr key={punto.periodo} className="border-t">
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  {etiquetaPunto(punto, unidadTiempo)}
                </th>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {punto.porcentajeParcial}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {punto.porcentajeAcumulado}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {punto.montoParcial}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {punto.montoAcumulado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function CurvaSChart({ curvaS, unidadTiempo }: CurvaSChartProps) {
  const { puntos } = curvaS;
  const [puntoActivo, setPuntoActivo] = useState(0);
  const id = useId();
  const tituloId = `${id}-titulo`;
  const descripcionId = `${id}-descripcion`;

  if (puntos.length === 0) {
    return (
      <figure aria-labelledby="curva-s-titulo" className="space-y-3">
        <figcaption id="curva-s-titulo" className="text-base font-semibold">
          Curva S
        </figcaption>
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay puntos de curva S para mostrar.
        </p>
      </figure>
    );
  }

  const geometrias: GeometriaPunto[] = puntos.map((punto, indice) => ({
    punto,
    indice,
    etiqueta: etiquetaPunto(punto, unidadTiempo),
    x: xPeriodo(indice, puntos.length),
    y: yPorcentaje(punto.porcentajeAcumulado),
  }));
  const path = geometrias
    .map(({ x, y }, indice) => `${indice === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const indicesDeEje = seleccionarIndicesDeEje(puntos.length);
  const indiceActivo = limitar(puntoActivo, 0, puntos.length - 1);
  const puntoActivoData = geometrias[indiceActivo];

  return (
    <figure aria-labelledby="curva-s-titulo" className="space-y-3">
      <figcaption id="curva-s-titulo" className="text-base font-semibold">
        Curva S
      </figcaption>
      <p className="text-sm text-muted-foreground">
        Programación acumulada por período; no representa avance ejecutado.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <svg
          role="img"
          aria-labelledby={tituloId}
          aria-describedby={descripcionId}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-auto min-w-[36rem] w-full text-foreground"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={tituloId}>Curva S de programación acumulada</title>
          <desc id={descripcionId}>
            Línea de porcentaje acumulado programado entre los períodos ordinales de la serie
            entregada por el servidor.
          </desc>
          {GRID_VALUES.map((valor) => {
            const y = yPorcentaje(String(valor));
            return (
              <g key={valor}>
                <line
                  x1={MARGINS.left}
                  x2={VIEWBOX_WIDTH - MARGINS.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.18"
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={MARGINS.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-current text-[11px]"
                >
                  {formatearPuntosPorcentaje(valor, 0)}
                </text>
              </g>
            );
          })}
          <line
            x1={MARGINS.left}
            x2={VIEWBOX_WIDTH - MARGINS.right}
            y1={VIEWBOX_HEIGHT - MARGINS.bottom}
            y2={VIEWBOX_HEIGHT - MARGINS.bottom}
            stroke="currentColor"
            strokeOpacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            aria-hidden="true"
          />
          {geometrias.map(({ punto, indice, etiqueta, x, y }) => (
            <circle
              key={punto.periodo}
              data-testid={`curva-s-punto-${punto.periodo}`}
              cx={x}
              cy={y}
              r={indice === indiceActivo ? 6 : 4}
              fill="currentColor"
              stroke="var(--background)"
              strokeWidth={indice === indiceActivo ? 2 : 1}
              onMouseEnter={() => setPuntoActivo(indice)}
            >
              <title>
                {etiqueta}: {punto.porcentajeAcumulado} %, {punto.montoAcumulado}
              </title>
            </circle>
          ))}
          {indicesDeEje.map((indice) => {
            const punto = geometrias[indice];
            return (
              <text
                key={punto.punto.periodo}
                x={punto.x}
                y={VIEWBOX_HEIGHT - MARGINS.bottom + 28}
                textAnchor="middle"
                className="fill-current text-[11px]"
              >
                {punto.etiqueta}
              </text>
            );
          })}
          <text x={MARGINS.left} y={VIEWBOX_HEIGHT - 10} className="fill-current text-[11px]">
            Períodos
          </text>
          <text
            x={12}
            y={MARGINS.top}
            transform={`rotate(-90 12 ${MARGINS.top})`}
            className="fill-current text-[11px]"
          >
            Porcentaje acumulado programado
          </text>
        </svg>
      </div>

      {detallePunto(puntoActivoData.punto, puntoActivoData.etiqueta)}

      <p className="sr-only">Puntos navegables por teclado:</p>
      <ol aria-label="Puntos de la curva S" className="sr-only">
        {geometrias.map(({ punto, indice, etiqueta }) => (
          <li key={punto.periodo}>
            <button
              type="button"
              aria-pressed={indice === indiceActivo}
              onFocus={() => setPuntoActivo(indice)}
              onClick={() => setPuntoActivo(indice)}
            >
              Seleccionar {etiqueta}: porcentaje acumulado {punto.porcentajeAcumulado}, monto
              acumulado {punto.montoAcumulado}
            </button>
          </li>
        ))}
      </ol>

      {tablaAlternativa(puntos, unidadTiempo)}
    </figure>
  );
}
