import { Loader2 } from "lucide-react";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { ResumenComponentesResponse } from "@/api/contract";

interface ResumenComponentesProps {
  data?: ResumenComponentesResponse;
  isLoading: boolean;
}

export function ResumenComponentes({ data, isLoading }: ResumenComponentesProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const items = [
    {
      label: "Equipo",
      total: data.equipo.total,
      pct: data.equipo.porcentaje,
      color: "bg-blue-500",
    },
    {
      label: "Mano de obra",
      total: data.manoObra.total,
      pct: data.manoObra.porcentaje,
      color: "bg-green-500",
    },
    {
      label: "Material",
      total: data.material.total,
      pct: data.material.porcentaje,
      color: "bg-amber-500",
    },
    {
      label: "Transporte",
      total: data.transporte.total,
      pct: data.transporte.porcentaje,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Desglose por componente</h4>
      <div className="flex h-3 rounded-full overflow-hidden">
        {items.map((item) => (
          <div
            key={item.label}
            className={item.color}
            style={{ width: `${Number(item.pct) * 100}%` }}
            title={`${item.label}: ${formatearPorcentaje(item.pct)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between border-b py-1">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-mono tabular-nums">
              {formatearMoneda(item.total)} ({formatearPorcentaje(item.pct)})
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-1 font-semibold col-span-2">
          <span>Total general</span>
          <span className="font-mono tabular-nums">{formatearMoneda(data.totalGeneral)}</span>
        </div>
      </div>
    </div>
  );
}
