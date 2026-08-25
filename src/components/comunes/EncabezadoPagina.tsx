import type { ReactNode } from "react";

/**
 * Encabezado común a todas las páginas: título, contexto y acciones en la misma
 * posición, para que el ojo no tenga que reaprender la pantalla en cada ruta.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  insignia,
  meta,
  acciones,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  insignia?: ReactNode;
  meta?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight">{titulo}</h1>
          {insignia}
        </div>
        {descripcion ? <p className="text-sm text-muted-foreground">{descripcion}</p> : null}
        {meta ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {meta}
          </div>
        ) : null}
      </div>
      {acciones ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
      ) : null}
    </div>
  );
}

/** Separador fino entre datos del encabezado. */
export function PuntoMeta() {
  return <span aria-hidden className="h-3 w-px bg-border" />;
}
