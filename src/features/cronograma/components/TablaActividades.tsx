import { formatearMoneda, formatearPuntosPorcentaje } from "@/lib/decimal";
import type { ActividadCronogramaResponse } from "@/api/contract";

interface TablaActividadesProps {
  actividades: ActividadCronogramaResponse[];
  periodos: number;
  onClickActividad?: (actividad: ActividadCronogramaResponse) => void;
}

export function TablaActividades({
  actividades,
  periodos,
  onClickActividad,
}: TablaActividadesProps) {
  return (
    <div className="overflow-x-auto w-fit max-w-full border rounded-lg">
      <table className="text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2 font-medium">Ítem</th>
            <th className="text-left px-3 py-2 font-medium">Código</th>
            <th className="text-left px-3 py-2 font-medium">Descripción</th>
            <th className="text-left px-3 py-2 font-medium">Unidad</th>
            <th className="text-right px-3 py-2 font-medium">Total</th>
            <th className="text-right px-3 py-2 font-medium">Peso</th>
            {Array.from({ length: periodos }, (_, i) => (
              <th key={i} className="text-right px-2 py-2 font-medium text-xs">
                P{i + 1}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-medium">Desv.</th>
          </tr>
        </thead>
        <tbody>
          {actividades.map((act) => (
            <tr
              key={act.id}
              className="border-b hover:bg-muted/30 cursor-pointer"
              onClick={() => onClickActividad?.(act)}
            >
              <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{act.item}</td>
              <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{act.codigo}</td>
              <td className="px-3 py-1.5">{act.descripcion}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{act.unidad}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatearMoneda(act.precioTotal)}
              </td>
              {/* Peso, avances y desviación son puntos de porcentaje escala 4,
                  no dinero ni fracciones. */}
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatearPuntosPorcentaje(act.pesoPonderado)}
              </td>
              {Array.from({ length: periodos }, (_, i) => {
                const periodo = String(i + 1);
                return (
                  <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums text-xs">
                    {act.avancePorPeriodo[periodo]
                      ? formatearPuntosPorcentaje(act.avancePorPeriodo[periodo])
                      : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                {formatearPuntosPorcentaje(act.desviacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
