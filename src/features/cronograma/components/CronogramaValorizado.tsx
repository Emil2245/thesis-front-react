import type { ReactElement } from "react";
import type {
  CapituloCronogramaResponse,
  PeriodoValorizadoResponse,
  RubroCronogramaResponse,
  ValorizadoBloqueResponse,
} from "@/api/contract";

function filasDeRubro(
  rubro: RubroCronogramaResponse,
  periodos: PeriodoValorizadoResponse[],
): ReactElement[] {
  return [
    <tr key={`rubro-valorizado-${rubro.id}`}>
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-normal">
        <span className="font-mono text-xs text-muted-foreground">{rubro.item}</span>{" "}
        {rubro.descripcion}
      </th>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
        {rubro.montoTotal ?? "—"}
      </td>
      {periodos.map((periodo) => (
        <td
          key={periodo.periodo}
          className="border-l px-2 py-2 text-right font-mono text-xs tabular-nums"
        >
          {rubro.montoPorPeriodo?.[String(periodo.periodo)] ?? "—"}
        </td>
      ))}
    </tr>,
  ];
}

function filasDeCapitulo(
  capitulo: CapituloCronogramaResponse,
  periodos: PeriodoValorizadoResponse[],
): ReactElement[] {
  return [
    <tr key={`capitulo-valorizado-${capitulo.id}`}>
      <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-semibold">
        <span className="font-mono text-xs text-muted-foreground">{capitulo.item}</span>{" "}
        {capitulo.descripcion}
      </th>
      <td
        colSpan={periodos.length ? periodos.length + 1 : 2}
        className="px-3 py-2 text-xs text-muted-foreground"
      >
        Capítulo
      </td>
    </tr>,
    ...capitulo.subcapitulos.flatMap((hijo) => filasDeCapitulo(hijo, periodos)),
    ...capitulo.rubros.flatMap((rubro) => filasDeRubro(rubro, periodos)),
  ];
}

export function CronogramaValorizado({ valorizado }: { valorizado: ValorizadoBloqueResponse }) {
  const { periodos, capitulos, totales } = valorizado;

  return (
    <section aria-labelledby="cronograma-valorizado-titulo" className="space-y-3">
      <h2 id="cronograma-valorizado-titulo" className="text-base font-semibold">
        Cronograma valorizado
      </h2>

      {periodos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay períodos valorizados para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Valores valorizados por período</caption>
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
              {periodos.map((periodo) => (
                <tr key={periodo.periodo} className="border-t">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {periodo.periodo}
                  </th>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {periodo.porcentajeParcial}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {periodo.porcentajeAcumulado}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {periodo.montoParcial}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
                    {periodo.montoAcumulado}
                  </td>
                </tr>
              ))}
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

      {capitulos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay rubros valorizados para mostrar.
        </p>
      ) : (
        <details open className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Detalle valorizado por rubro
          </summary>
          <div className="overflow-x-auto border-t">
            <table className="min-w-full text-sm">
              <caption className="sr-only">
                Montos valorizados por capítulo, rubro y período
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    Rubro
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    Monto total
                  </th>
                  {periodos.map((periodo) => (
                    <th
                      key={periodo.periodo}
                      scope="col"
                      className="min-w-24 px-2 py-2 text-right font-medium"
                    >
                      P{periodo.periodo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{capitulos.flatMap((capitulo) => filasDeCapitulo(capitulo, periodos))}</tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
