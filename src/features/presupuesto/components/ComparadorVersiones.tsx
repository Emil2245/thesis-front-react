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
  if (!data) return null;

  const difTotal = Number(data.versionB.totalGeneral) - Number(data.versionA.totalGeneral);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm border-b pb-2">
        <span className="text-muted-foreground">
          v{data.versionA.numero} → v{data.versionB.numero}
        </span>
        <span className="font-mono tabular-nums font-semibold">
          {formatearMoneda(data.versionA.totalGeneral)} →{" "}
          {formatearMoneda(data.versionB.totalGeneral)}
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
            {formatearMoneda(String(Math.abs(difTotal)) as never)}
          </span>
        </span>
      </div>
      <div className="space-y-1 text-sm">
        {data.capitulos.map((cap) => {
          const dif = Number(cap.diferencia);
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
                {formatearMoneda(cap.diferencia)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
