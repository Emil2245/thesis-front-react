import { Skeleton } from "@/components/ui/skeleton";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { ResumenComponentesResponse } from "@/api/contract";

interface ResumenComponentesProps {
  data?: ResumenComponentesResponse;
  isLoading: boolean;
}

export function ResumenComponentes({ data, isLoading }: ResumenComponentesProps) {
  if (isLoading) return <Skeleton className="h-28 w-full" />;
  if (!data) return null;

  // Tokens del tema, no colores crudos: el desglose debe seguir la paleta.
  const items = [
    { label: "Equipo", total: data.equipo.total, pct: data.equipo.porcentaje, color: "bg-chart-1" },
    {
      label: "Mano de obra",
      total: data.manoObra.total,
      pct: data.manoObra.porcentaje,
      color: "bg-exito",
    },
    {
      label: "Material",
      total: data.material.total,
      pct: data.material.porcentaje,
      color: "bg-advertencia",
    },
    {
      label: "Transporte",
      total: data.transporte.total,
      pct: data.transporte.porcentaje,
      color: "bg-muted-foreground",
    },
  ];

  return (
    <TarjetaTabla titulo="Desglose por componente">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">Total general</span>
          <span className="num text-2xl font-semibold tracking-tight">
            {formatearMoneda(data.totalGeneral)}
          </span>
        </div>

        {/* Decorativa: las mismas cifras están en la lista de abajo. */}
        <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
          {items.map((item) => (
            <div
              key={item.label}
              className={item.color}
              style={{ width: `${Number(item.pct) * 100}%` }}
            />
          ))}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${item.color}`} />
                {item.label}
              </dt>
              <dd className="flex items-baseline gap-1.5">
                <span className="num text-sm font-medium">{formatearMoneda(item.total)}</span>
                <span className="text-xs text-muted-foreground">
                  {formatearPorcentaje(item.pct)}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </TarjetaTabla>
  );
}
