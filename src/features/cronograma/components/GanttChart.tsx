import { formatearPuntosPorcentaje } from "@/lib/decimal";
import type { CronogramaResponse, SegmentoResponse } from "@/api/contract";

interface GanttChartProps {
  cronograma: CronogramaResponse;
}

const COL_LABEL = 200;
const COL_PERIOD = 64;

function etiquetaPeriodo(unidad: string, periodo: number): string {
  return unidad === "SEMANA" ? `S${periodo}` : `M${periodo}`;
}

const contiene = (s: SegmentoResponse, p: number) => p >= s.inicio && p <= s.fin;

export function GanttChart({ cronograma }: GanttChartProps) {
  const { actividades, numeroPeriodos, avancePorPeriodo, avanceAcumulado, unidadTiempo } =
    cronograma;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold">Diagrama de Gantt</h3>

      <div className="overflow-x-auto w-fit max-w-full border rounded-lg">
        <div style={{ minWidth: COL_LABEL + numeroPeriodos * COL_PERIOD }}>
          {/* ── Header: timeline ── */}
          <div className="flex border-b bg-muted/50 sticky top-0 z-10">
            <div
              className="shrink-0 px-3 py-2 text-xs font-medium border-r"
              style={{ width: COL_LABEL }}
            >
              Actividad
            </div>
            {Array.from({ length: numeroPeriodos }, (_, i) => {
              const p = i + 1;
              return (
                <div
                  key={p}
                  className="shrink-0 text-center py-2 text-xs font-medium border-r last:border-r-0"
                  style={{ width: COL_PERIOD }}
                >
                  {etiquetaPeriodo(unidadTiempo, p)}
                </div>
              );
            })}
          </div>

          {/* ── Activity rows with bars ── */}
          {actividades.map((act) => {
            // Las barras salen de `segmentos[]`, que ya los calcula el backend:
            // derivarlas del mapa perdía el caso de una actividad con dos
            // corridas separadas, que se pintaba como una sola barra continua.
            const peso = Number(act.pesoPonderado);

            return (
              <div key={act.id} className="flex border-b hover:bg-muted/20 group">
                <div
                  className="shrink-0 px-3 py-1.5 border-r flex flex-col justify-center"
                  style={{ width: COL_LABEL }}
                >
                  <span className="text-xs font-mono text-muted-foreground">{act.item}</span>
                  <span className="text-xs truncate" title={act.descripcion}>
                    {act.descripcion}
                  </span>
                </div>
                {Array.from({ length: numeroPeriodos }, (_, i) => {
                  const p = i + 1;
                  const segmento = act.segmentos.find((s) => contiene(s, p));
                  const valor = act.avancePorPeriodo[String(p)];
                  // Cuánto del peso de la actividad cae en este período: es un
                  // ratio de porcentajes para la opacidad, no aritmética de dinero.
                  const intensidad = peso > 0 ? Math.min(Number(valor ?? 0) / peso, 1) : 0;

                  return (
                    <div
                      key={p}
                      className="shrink-0 border-r last:border-r-0 relative flex items-center"
                      style={{ width: COL_PERIOD, height: 40 }}
                    >
                      {/* Grid line */}
                      <div className="absolute inset-0 border-r border-dashed border-border/30" />

                      {segmento && (
                        <div
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-0.5"
                          style={{ height: 20 }}
                        >
                          <div
                            className={[
                              "h-full bg-foreground/70",
                              p === segmento.inicio ? "rounded-l" : "",
                              p === segmento.fin ? "rounded-r" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{ opacity: 0.3 + intensidad * 0.7 }}
                            title={`${etiquetaPeriodo(unidadTiempo, p)}: ${formatearPuntosPorcentaje(valor)}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Resumen: los dos arrays densos del cronograma, ya en puntos de
                porcentaje sobre 100. No hay que dividirlos por el total. ── */}
          {(
            [
              ["Avance por período", avancePorPeriodo, "bg-foreground/60"],
              ["Avance acumulado", avanceAcumulado, "bg-foreground"],
            ] as const
          ).map(([titulo, serie, color]) => (
            <div key={titulo} className="flex border-b last:border-b-0 bg-muted/30">
              <div
                className="shrink-0 px-3 py-1.5 border-r text-xs font-medium flex items-center"
                style={{ width: COL_LABEL }}
              >
                {titulo}
              </div>
              {Array.from({ length: numeroPeriodos }, (_, i) => {
                const puntos = Number(serie[i] ?? 0);
                return (
                  <div
                    key={i}
                    className="shrink-0 border-r last:border-r-0 px-1 py-1.5 flex flex-col items-center justify-center"
                    style={{ width: COL_PERIOD }}
                  >
                    <span className="text-[10px] font-mono tabular-nums">
                      {formatearPuntosPorcentaje(serie[i], 2)}
                    </span>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`${color} h-full rounded-full`}
                        style={{ width: `${Math.min(puntos, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
