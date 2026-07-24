import { formatearNumero } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";

export function Numero({
  valor,
  min = 2,
  max = 4,
  className,
}: {
  valor: Decimal | null | undefined;
  min?: number;
  max?: number;
  className?: string;
}) {
  return <span className={cn("num", className)}>{formatearNumero(valor, { min, max })}</span>;
}
