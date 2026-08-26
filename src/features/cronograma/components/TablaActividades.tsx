import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { ActividadResponse } from "@/api/contract";

interface TablaActividadesProps {
  actividades: ActividadResponse[];
  periodos: number;
  onClickActividad?: (actividad: ActividadResponse) => void;
}

export function TablaActividades({
  actividades,
  periodos,
  onClickActividad,
}: TablaActividadesProps) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left px-3 py-2 font-medium">Ítem</th>
            <th className="text-left px-3 py-2 font-medium">Descripción</th>
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
              <td className="px-3 py-1.5">{act.descripcion}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatearMoneda(act.precioTotal)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatearPorcentaje(act.pesoPonderado)}
              </td>
              {Array.from({ length: periodos }, (_, i) => {
                const periodo = String(i + 1);
                return (
                  <td key={i} className="px-2 py-1.5 text-right font-mono tabular-nums text-xs">
                    {act.avancePorPeriodo[periodo]
                      ? formatearMoneda(act.avancePorPeriodo[periodo])
                      : "—"}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-xs">
                {formatearMoneda(act.desviacion)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
