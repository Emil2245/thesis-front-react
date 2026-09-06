import { Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatearMoneda } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import type { ComparacionVersionesResponse } from "@/api/contract";

interface ComparadorVersionesProps {
  data?: ComparacionVersionesResponse;
  isLoading: boolean;
}

export function ComparadorVersiones({ data, isLoading }: ComparadorVersionesProps) {
  if (isLoading)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  if (!data || data.versiones.length < 2) return null;

  const [vA, vB] = data.versiones;
  const difTotal = Number(vB.totalGeneral) - Number(vA.totalGeneral);

  const capitulosMap = new Map<
    string,
    { item: string; descripcion: string; totalA: number; totalB: number }
  >();
  for (const cap of vA.porCapituloRaiz) {
    capitulosMap.set(cap.item, {
      item: cap.item,
      descripcion: cap.descripcion,
      totalA: Number(cap.total),
      totalB: 0,
    });
  }
  for (const cap of vB.porCapituloRaiz) {
    const existing = capitulosMap.get(cap.item);
    if (existing) {
      existing.totalB = Number(cap.total);
    } else {
      capitulosMap.set(cap.item, {
        item: cap.item,
        descripcion: cap.descripcion,
        totalA: 0,
        totalB: Number(cap.total),
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
          <span
            className={cn(
              "ml-2 inline-flex items-center",
              difTotal >= 0 ? "text-exito-texto" : "text-peligro-texto",
            )}
          >
            {difTotal > 0 ? (
              <ArrowUp className="size-3" />
            ) : difTotal < 0 ? (
              <ArrowDown className="size-3" />
            ) : (
              <Minus className="size-3" />
            )}
            {formatearMoneda(Math.abs(difTotal))}
          </span>
        </span>
      </div>
      <div className="space-y-1 text-sm">
        {capitulos.map((cap) => {
          const dif = cap.totalB - cap.totalA;
          return (
            <div key={cap.item} className="flex items-center justify-between border-b py-1.5">
              <span className="font-mono text-xs text-muted-foreground w-12">{cap.item}</span>
              <span className="flex-1">{cap.descripcion}</span>
              <span className="font-mono tabular-nums w-28 text-right">
                {formatearMoneda(cap.totalA)}
              </span>
              <span className="font-mono tabular-nums w-28 text-right">
                {formatearMoneda(cap.totalB)}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums w-28 text-right",
                  dif > 0 ? "text-exito-texto" : dif < 0 ? "text-peligro-texto" : "",
                )}
              >
                {dif > 0 ? "+" : ""}
                {formatearMoneda(dif)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
