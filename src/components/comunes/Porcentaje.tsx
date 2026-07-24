import { formatearPorcentaje } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";

export function Porcentaje({
  valor,
  dp = 2,
  className,
}: {
  valor: Decimal | null | undefined;
  dp?: number;
  className?: string;
}) {
  return <span className={cn("num", className)}>{formatearPorcentaje(valor, dp)}</span>;
}
