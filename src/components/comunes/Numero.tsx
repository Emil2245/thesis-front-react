import { formatearNumero } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useDisplayPrecision } from "@/hooks/useDisplayConfig";

export function Numero({
  valor,
  min,
  max,
  className,
}: {
  valor: Decimal | null | undefined;
  min?: number;
  max?: number;
  className?: string;
}) {
  const { precisionDinero } = useDisplayPrecision();
  return (
    <span className={cn("num", className)}>
      {formatearNumero(valor, { min: min ?? precisionDinero, max: max ?? precisionDinero + 2 })}
    </span>
  );
}
