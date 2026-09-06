import { Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { compararDecimal, DECIMAL_ZERO, formatearMoneda, type Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import type { ComparacionVersionesResponse } from "@/api/contract";

interface ComparadorVersionesProps {
  data?: ComparacionVersionesResponse;
  isLoading: boolean;
}

// El frontend no hace aritmética de dinero (ADR 9): `GET /presupuestos/{id}/comparar`
// devuelve los dos totales y ninguna diferencia, así que se muestran los dos y solo
// se compara el sentido. Restarlos aquí imprimía 39511.53200000001.
function Flecha({ sentido }: { sentido: number }) {
  if (sentido > 0) return <ArrowUp className="size-3" />;
  if (sentido < 0) return <ArrowDown className="size-3" />;
  return <Minus className="size-3" />;
}

const colorSentido = (sentido: number) =>
  sentido > 0 ? "text-exito-texto" : sentido < 0 ? "text-peligro-texto" : "";

export function ComparadorVersiones({ data, isLoading }: ComparadorVersionesProps) {
  if (isLoading)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  if (!data || data.versiones.length < 2) return null;

  const [vA, vB] = data.versiones;
  const sentidoTotal = compararDecimal(vB.totalGeneral, vA.totalGeneral);

  const capitulosMap = new Map<
    string,
    { item: string; descripcion: string; totalA: Decimal; totalB: Decimal }
  >();
  for (const cap of vA.porCapituloRaiz) {
    capitulosMap.set(cap.item, {
      item: cap.item,
      descripcion: cap.descripcion,
      totalA: cap.total,
      totalB: DECIMAL_ZERO,
    });
  }
  for (const cap of vB.porCapituloRaiz) {
    const existing = capitulosMap.get(cap.item);
    if (existing) {
      existing.totalB = cap.total;
    } else {
      capitulosMap.set(cap.item, {
        item: cap.item,
        descripcion: cap.descripcion,
        totalA: DECIMAL_ZERO,
        totalB: cap.total,
      });
    }
  }
  const capitulos = [...capitulosMap.values()];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm border-b pb-2">
        <span className="text-muted-foreground">
          v{vA.version} → v{vB.version}
        </span>
        <span className="font-mono tabular-nums font-semibold">
          {formatearMoneda(vA.totalGeneral)} → {formatearMoneda(vB.totalGeneral)}
          <span className={cn("ml-2 inline-flex items-center", colorSentido(sentidoTotal))}>
            <Flecha sentido={sentidoTotal} />
          </span>
        </span>
      </div>
      <div className="space-y-1 text-sm">
        {capitulos.map((cap) => {
          const sentido = compararDecimal(cap.totalB, cap.totalA);
          return (
            <div key={cap.item} className="flex items-center justify-between border-b py-1.5">
              <span className="font-mono text-xs text-muted-foreground w-12">{cap.item}</span>
              <span className="flex-1">{cap.descripcion}</span>
              <span className="font-mono tabular-nums w-28 text-right">
                {formatearMoneda(cap.totalA)}
              </span>
              <span className={cn("font-mono tabular-nums w-28 text-right", colorSentido(sentido))}>
                {formatearMoneda(cap.totalB)}
              </span>
              <span className={cn("inline-flex justify-end w-6", colorSentido(sentido))}>
                <Flecha sentido={sentido} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
