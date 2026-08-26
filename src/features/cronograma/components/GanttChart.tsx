import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { CronogramaResponse, ActividadResponse } from "@/api/contract";

interface GanttChartProps {
  cronograma: CronogramaResponse;
}

const COL_LABEL = 200;
const COL_PERIOD = 64;

function etiquetaPeriodo(unidad: string, periodo: number): string {
  return unidad === "SEMANA" ? `S${periodo}` : `M${periodo}`;
}

function rangoActivo(act: ActividadResponse, periodos: number) {
  let min = periodos + 1;
  let max = 0;
  for (let p = 1; p <= periodos; p++) {
    if (Number(act.avancePorPeriodo[String(p)] || 0) > 0) {
      if (p < min) min = p;
      if (p > max) max = p;
    }
  }
  return min <= max ? { desde: min, hasta: max } : null;
}

export function GanttChart({ cronograma }: GanttChartProps) {
  const {
    actividades,
    numeroPeriodos,
    avancePorPeriodo,
    avanceAcumulado,
    totalGeneral,
    unidadTiempo,
  } = cronograma;
  const total = Number(totalGeneral);

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
            const rango = rangoActivo(act, numeroPeriodos);
            const actTotal = Number(act.precioTotal);

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
                  const val = Number(act.avancePorPeriodo[String(p)] || 0);
                  const isActive = rango && p >= rango.desde && p <= rango.hasta;
                  const isFirst = rango && p === rango.desde;
                  const isLast = rango && p === rango.hasta;
                  const intensity = actTotal > 0 ? Math.min(val / actTotal, 1) : 0;

                  return (
                    <div
                      key={p}
                      className="shrink-0 border-r last:border-r-0 relative flex items-center"
                      style={{ width: COL_PERIOD, height: 40 }}
                    >
                      {/* Grid line */}
                      <div className="absolute inset-0 border-r border-dashed border-border/30" />

                      {isActive && (
                        <div
                          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-0.5"
                          style={{ height: 20 }}
                        >
                          <div
                            className={[
                              "h-full bg-foreground/70",
                              isFirst && isLast ? "rounded" : "",
                              isFirst && !isLast ? "rounded-l" : "",
                              isLast && !isFirst ? "rounded-r" : "",
                              !isFirst && !isLast ? "" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            style={{ opacity: 0.3 + intensity * 0.7 }}
                            title={`${etiquetaPeriodo(unidadTiempo, p)}: ${formatearMoneda(val as never)}`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Summary: avance por período ── */}
          <div className="flex border-b bg-muted/30">
            <div
              className="shrink-0 px-3 py-1.5 border-r text-xs font-medium flex items-center"
              style={{ width: COL_LABEL }}
            >
              Avance por período
            </div>
            {avancePorPeriodo.map((val, i) => {
              const pct = total > 0 ? (Number(val) / total) * 100 : 0;
              return (
                <div
                  key={i}
                  className="shrink-0 border-r last:border-r-0 px-1 py-1.5 flex flex-col items-center justify-center"
                  style={{ width: COL_PERIOD }}
                >
                  <span className="text-[10px] font-mono tabular-nums">
                    {formatearPorcentaje(String(pct / 100) as never)}
                  </span>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                    <div
                      className="bg-foreground/60 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary: avance acumulado ── */}
          <div className="flex bg-muted/30">
            <div
              className="shrink-0 px-3 py-1.5 border-r text-xs font-medium flex items-center"
              style={{ width: COL_LABEL }}
            >
              Avance acumulado
            </div>
            {avanceAcumulado.map((val, i) => {
              const pct = total > 0 ? (Number(val) / total) * 100 : 0;
              return (
                <div
                  key={i}
                  className="shrink-0 border-r last:border-r-0 px-1 py-1.5 flex flex-col items-center justify-center"
                  style={{ width: COL_PERIOD }}
                >
                  <span className="text-[10px] font-mono tabular-nums">
                    {formatearPorcentaje(String(pct / 100) as never)}
                  </span>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                    <div
                      className="bg-foreground h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
