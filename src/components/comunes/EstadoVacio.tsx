import type { ReactNode } from "react";

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  icono,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      {icono}
      <h3 className="text-lg font-medium">{titulo}</h3>
      {descripcion ? <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p> : null}
      {accion}
    </div>
  );
}
