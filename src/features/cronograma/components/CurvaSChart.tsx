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

/**
 * Fondo de la columna de porcentaje acumulado: un único degradado semáforo
 * (rojo → amarillo → verde) que cubre toda la columna de arriba abajo, vía
 * `<col>` — el acumulado del servidor solo crece período a período, así que
 * el degradado sigue exactamente el sentido en que sube el avance. Es color
 * de UI, no un cálculo sobre el dato.
 */
const GRADIENTE_ACUMULADO =
  "linear-gradient(to bottom, hsl(0 75% 45% / 0.3), hsl(60 75% 45% / 0.3) 50%, hsl(120 75% 45% / 0.3))";

/**
 * Trazo suavizado por interpolación cúbica monótona (Fritsch–Carlson, la misma
 * que `d3.curveMonotoneX`). Un spline cualquiera se pasa de los puntos: el
 * acumulado parecería bajar entre dos períodos o superar el 100 %. Éste pasa
 * exactamente por cada punto del servidor y conserva la monotonía. Es
 * geometría de píxeles, no un cálculo sobre los porcentajes.
 */
function trazoSuavizado(puntos: { x: number; y: number }[]): string {
  const n = puntos.length;
  if (n === 0) return "";
  if (n < 3) return puntos.map(({ x, y }, i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

  const pendientes = puntos
    .slice(0, -1)
    .map((p, i) => (puntos[i + 1].y - p.y) / (puntos[i + 1].x - p.x));
  const tangentes = puntos.map((_, i) => {
    if (i === 0) return pendientes[0];
    if (i === n - 1) return pendientes[n - 2];
    const [izquierda, derecha] = [pendientes[i - 1], pendientes[i]];
    return izquierda * derecha <= 0 ? 0 : (izquierda + derecha) / 2;
  });
  pendientes.forEach((pendiente, i) => {
    if (pendiente === 0) {
      tangentes[i] = 0;
      tangentes[i + 1] = 0;
      return;
    }
    const a = tangentes[i] / pendiente;
    const b = tangentes[i + 1] / pendiente;
    const suma = a * a + b * b;
    if (suma > 9) {
      const tau = 3 / Math.sqrt(suma);
      tangentes[i] = tau * a * pendiente;
      tangentes[i + 1] = tau * b * pendiente;
    }
  });

  return puntos
    .map(({ x, y }, i) => {
      if (i === 0) return `M ${x} ${y}`;
      const previo = puntos[i - 1];
      const tercio = (x - previo.x) / 3;
      return `C ${previo.x + tercio} ${previo.y + tangentes[i - 1] * tercio} ${x - tercio} ${y - tangentes[i] * tercio} ${x} ${y}`;
    })
    .join(" ");
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
      className="h-fit rounded-lg border bg-muted/20 px-8 py-4"
    >
      <h3 className="text-sm font-medium">Detalle del punto</h3>
      <dl className="mt-3 grid gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Período</dt>
          <dd className="font-mono tabular-nums">{etiqueta}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Porcentaje acumulado programado</dt>
          <dd className="text-right font-mono tabular-nums">
            {formatearPuntosPorcentaje(punto.porcentajeAcumulado)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Monto acumulado</dt>
          <dd className="text-right font-mono tabular-nums">
            {formatearMoneda(punto.montoAcumulado)}
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
          <colgroup>
            <col />
            <col />
            <col style={{ backgroundImage: GRADIENTE_ACUMULADO }} />
            <col />
            <col />
          </colgroup>
          <thead className="bg-muted">
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
                  {formatearPuntosPorcentaje(punto.porcentajeParcial, 2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                  {formatearPuntosPorcentaje(punto.porcentajeAcumulado, 2)}
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
  const path = trazoSuavizado(geometrias);
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="overflow-x-auto rounded-lg border p-2">
          <svg
            role="img"
            aria-labelledby={tituloId}
            aria-describedby={descripcionId}
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="h-auto min-w-[28rem] w-full text-foreground"
            preserveAspectRatio="xMidYMid meet"
          >
            <title id={tituloId}>Curva S de programación acumulada</title>
            <desc id={descripcionId}>
              Línea de porcentaje acumulado programado entre los períodos ordinales de la serie
              entregada por el servidor.
            </desc>
            <defs>
              <filter id={`${id}-brillo`} x="-150%" y="-150%" width="400%" height="400%">
                <feGaussianBlur stdDeviation="4" result="difuminado" />
                <feMerge>
                  <feMergeNode in="difuminado" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
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
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              aria-hidden="true"
            />
            {geometrias.map(({ punto, indice, etiqueta, x, y }) => (
              <g key={punto.periodo}>
                {indice === indiceActivo && (
                  <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill="currentColor"
                    opacity={0.35}
                    filter={`url(#${id}-brillo)`}
                    aria-hidden="true"
                  >
                    <animate
                      attributeName="r"
                      values="8;14;8"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.45;0.12;0.45"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
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
              </g>
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
              x={16}
              y={MARGINS.top + (VIEWBOX_HEIGHT - MARGINS.top - MARGINS.bottom) / 2}
              textAnchor="middle"
              transform={`rotate(-90 16 ${MARGINS.top + (VIEWBOX_HEIGHT - MARGINS.top - MARGINS.bottom) / 2})`}
              className="fill-current text-[11px]"
            >
              Porcentaje acumulado programado
            </text>
          </svg>
        </div>

        {detallePunto(puntoActivoData.punto, puntoActivoData.etiqueta)}
      </div>

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
