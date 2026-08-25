import { cn } from "@/lib/utils";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { CronogramaResponse } from "@/api/contract";

interface GanttChartProps {
  cronograma: CronogramaResponse;
}

// Rampa monocroma: opacidades decrecientes del color de texto, así invierte
// sola en modo oscuro y no depende de --chart-*, que son todos neutros.
const COLORS = [
  "bg-foreground/90",
  "bg-foreground/75",
  "bg-foreground/60",
  "bg-foreground/45",
  "bg-foreground/30",
  "bg-foreground/15",
];

export function GanttChart({ cronograma }: GanttChartProps) {
  const { actividades, numeroPeriodos, avancePorPeriodo, avanceAcumulado, totalGeneral } =
    cronograma;
  const maxAvance = Math.max(...avancePorPeriodo.map(Number), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Diagrama de Gantt — Avance por período</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px] space-y-1">
          {actividades.map((act) => {
            const total = Number(act.precioTotal);
            return (
              <div
                key={act.id}
                className="grid items-center gap-2 text-xs"
                style={{ gridTemplateColumns: "120px 1fr" }}
              >
                <span className="truncate text-right text-muted-foreground" title={act.descripcion}>
                  {act.item}
                </span>
                <div className="flex h-5 rounded-sm overflow-hidden">
                  {Array.from({ length: numeroPeriodos }, (_, p) => {
                    const val = Number(act.avancePorPeriodo[String(p)] || 0);
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    if (pct < 0.5) return null;
                    return (
                      <div
                        key={p}
                        className={cn(COLORS[p % COLORS.length], "h-full")}
                        style={{ width: `${pct}%` }}
                        title={`P${p + 1}: ${formatearMoneda(val as never)}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h4 className="font-medium mb-2">Avance por período</h4>
          <div className="space-y-1">
            {avancePorPeriodo.map((val, i) => (
              <div key={i} className="flex justify-between border-b py-0.5">
                <span className="text-muted-foreground">Período {i + 1}</span>
                <span className="font-mono tabular-nums">
                  {formatearMoneda(val as never)} (
                  {formatearPorcentaje(String(Number(val) / Number(totalGeneral)) as never)})
                  <div className="inline-block ml-2 w-20 h-2.5 bg-muted rounded-sm align-middle overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-sm"
                      style={{ width: `${(Number(val) / maxAvance) * 100}%` }}
                    />
                  </div>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Avance acumulado</h4>
          <div className="space-y-1">
            {avanceAcumulado.map((val, i) => {
              const pct = Number(totalGeneral) > 0 ? (Number(val) / Number(totalGeneral)) * 100 : 0;
              return (
                <div key={i} className="flex justify-between border-b py-0.5">
                  <span className="text-muted-foreground">Período {i + 1}</span>
                  <span className="font-mono tabular-nums">
                    {formatearPorcentaje(String(pct / 100) as never)}
                    <div className="inline-block ml-2 w-20 h-2.5 bg-muted rounded-sm align-middle overflow-hidden">
                      <div
                        className="bg-foreground h-full rounded-sm"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
