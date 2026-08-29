import { formatearPorcentaje } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { useDisplayPrecision } from "@/hooks/useDisplayConfig";

export function Porcentaje({
  valor,
  dp,
  className,
}: {
  valor: Decimal | null | undefined;
  dp?: number;
  className?: string;
}) {
  const { precisionPorcentaje } = useDisplayPrecision();
  return (
    <span className={cn("num", className)}>
      {formatearPorcentaje(valor, dp ?? precisionPorcentaje)}
    </span>
  );
}
