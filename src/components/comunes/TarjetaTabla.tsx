import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Contenedor de tablas y listados: una superficie con borde, sin el relleno de
 * Card, para que la tabla llegue hasta el filo.
 */
export function TarjetaTabla({
  titulo,
  accion,
  pie,
  className,
  children,
}: {
  titulo?: ReactNode;
  accion?: ReactNode;
  pie?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      {titulo || accion ? (
        <div className="flex h-11 items-center justify-between gap-3 border-b px-4">
          {titulo ? <span className="text-sm font-medium">{titulo}</span> : <span />}
          {accion}
        </div>
      ) : null}
      {children}
      {pie ? (
        <div className="flex items-center justify-between gap-4 border-t bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
          {pie}
        </div>
      ) : null}
    </div>
  );
}
