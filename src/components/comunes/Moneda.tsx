import { formatearMoneda } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useDisplayPrecision } from "@/hooks/useDisplayConfig";

export function Moneda({
  valor,
  dp,
  className,
}: {
  valor: Decimal | number | null | undefined;
  dp?: number;
  className?: string;
}) {
  const { precisionDinero } = useDisplayPrecision();
  return (
    <span className={cn("num", className)}>{formatearMoneda(valor, dp ?? precisionDinero)}</span>
  );
}
