import { formatearMoneda } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";

export function Moneda({
  valor,
  dp = 2,
  className,
}: {
  valor: Decimal | number | null | undefined;
  dp?: number;
  className?: string;
}) {
  return <span className={cn("num", className)}>{formatearMoneda(valor, dp)}</span>;
}
