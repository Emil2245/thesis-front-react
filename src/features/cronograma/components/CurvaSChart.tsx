import type { CurvaSResponse } from "@/api/contract";

/**
 * The server already provides the complete S-curve series. A table is used here
 * instead of calculating SVG coordinates in the browser; it remains readable,
 * copyable, and fully navigable with a keyboard or screen reader.
 */
export function CurvaSChart({ curvaS }: { curvaS: CurvaSResponse }) {
  return (
    <figure aria-labelledby="curva-s-titulo" className="space-y-3">
      <figcaption id="curva-s-titulo" className="text-base font-semibold">
        Curva S
      </figcaption>
      {curvaS.puntos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No hay puntos de curva S para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <caption className="sr-only">Curva S por período</caption>
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
              {curvaS.puntos.map((punto) => (
                <tr key={punto.periodo} className="border-t">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {punto.periodo}
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
      )}
    </figure>
  );
}
