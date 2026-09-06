import { Skeleton } from "@/components/ui/skeleton";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { formatearMoneda, formatearPorcentaje } from "@/lib/decimal";
import type { ResumenComponentesResponse } from "@/api/contract";

interface ResumenComponentesProps {
  data?: ResumenComponentesResponse;
  isLoading: boolean;
}

const COMPONENTE_META: Record<string, { label: string; color: string }> = {
  EQUIPO: { label: "Equipo", color: "bg-chart-1" },
  MANO_OBRA: { label: "Mano de obra", color: "bg-exito" },
  MATERIAL: { label: "Material", color: "bg-advertencia" },
  TRANSPORTE: { label: "Transporte", color: "bg-muted-foreground" },
};

export function ResumenComponentes({ data, isLoading }: ResumenComponentesProps) {
  if (isLoading) return <Skeleton className="h-28 w-full" />;
  if (!data) return null;

  const total = Number(data.totalGeneral);
  const items = Object.entries(data.porComponente).map(([key, val]) => {
    const meta = COMPONENTE_META[key] ?? { label: key, color: "bg-muted-foreground" };
    const numVal = Number(val);
    const pct = total > 0 ? numVal / total : 0;
    return { ...meta, total: val, pct };
  });

  return (
    <TarjetaTabla titulo="Desglose por componente">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-muted-foreground">Total general</span>
          <span className="num text-2xl font-semibold tracking-tight">
            {formatearMoneda(data.totalGeneral)}
          </span>
        </div>

        <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
          {items.map((item) => (
            <div key={item.label} className={item.color} style={{ width: `${item.pct * 100}%` }} />
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

        <div className="flex items-baseline justify-between gap-4 border-t pt-3 text-sm">
          <span className="text-muted-foreground">IVA referencial</span>
          <span className="num font-medium">{formatearMoneda(data.ivaReferencial)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Total con IVA</span>
          <span className="num font-semibold">{formatearMoneda(data.totalConIva)}</span>
        </div>
      </div>
    </TarjetaTabla>
  );
}
