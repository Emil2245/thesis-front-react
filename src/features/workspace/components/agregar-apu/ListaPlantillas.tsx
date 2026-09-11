import { useRef } from "react";
import type { KeyboardEvent } from "react";

import type { PlantillaApuResumenResponse } from "@/api/contract";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- selector compuesto con filas y checkboxes independientes */
interface ListaPlantillasProps {
  plantillas: PlantillaApuResumenResponse[];
  activaId: string | null;
  seleccionadas: ReadonlySet<string>;
  onActivar: (id: string) => void;
  onSeleccionar: (id: string, checked: boolean, ordenVisual: string[]) => void;
  cargando: boolean;
  ocultarResultados: boolean;
  error: boolean;
  sinFuentes: boolean;
  page: number;
  totalPaginas: number;
  onPageChange: (page: number) => void;
}

export function ListaPlantillas({
  plantillas,
  activaId,
  seleccionadas,
  onActivar,
  onSeleccionar,
  cargando,
  ocultarResultados,
  error,
  sinFuentes,
  page,
  totalPaginas,
  onPageChange,
}: ListaPlantillasProps) {
  const filasRef = useRef<Array<HTMLDivElement | null>>([]);
  const ordenVisual = plantillas.map((plantilla) => plantilla.id);

  const navegar = (event: KeyboardEvent<HTMLDivElement>, indice: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivar(plantillas[indice]?.id ?? "");
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const siguiente = event.key === "ArrowDown" ? indice + 1 : indice - 1;
    const destino = filasRef.current[siguiente];
    if (destino) {
      destino.focus();
      onActivar(plantillas[siguiente]?.id ?? "");
    }
  };

  let estado: string | null = null;
  if (sinFuentes) estado = "Selecciona al menos una fuente.";
  else if (error) estado = "No se pudieron cargar las plantillas.";
  else if (cargando && plantillas.length === 0) estado = "Cargando plantillas…";
  else if (plantillas.length === 0) estado = "No hay plantillas para estos filtros.";

  return (
    <section
      aria-label="Plantillas disponibles"
      className="flex min-h-0 flex-col rounded-lg border"
    >
      <div
        role="listbox"
        aria-label="Plantillas disponibles"
        aria-busy={cargando}
        className="relative min-h-48 flex-1 overflow-y-auto p-1"
      >
        {estado ? (
          <p className="grid min-h-44 place-items-center px-4 text-center text-sm text-muted-foreground">
            {estado}
          </p>
        ) : (
          <div
            className={cn("space-y-1", ocultarResultados && "invisible")}
            aria-hidden={ocultarResultados || undefined}
          >
            {plantillas.map((plantilla, indice) => (
              <div
                key={plantilla.id}
                ref={(elemento) => {
                  filasRef.current[indice] = elemento;
                }}
                role="option"
                aria-selected={activaId === plantilla.id}
                tabIndex={activaId === plantilla.id || (!activaId && indice === 0) ? 0 : -1}
                onClick={() => onActivar(plantilla.id)}
                onKeyDown={(event) => navegar(event, indice)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-3 outline-none hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
                  activaId === plantilla.id && "border-foreground/20 bg-muted",
                )}
              >
                <Checkbox
                  checked={seleccionadas.has(plantilla.id)}
                  aria-label={`Seleccionar ${plantilla.nombre}`}
                  onClick={(event) => event.stopPropagation()}
                  onCheckedChange={(checked) =>
                    onSeleccionar(plantilla.id, checked === true, ordenVisual)
                  }
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{plantilla.nombre}</span>
                  <span className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                    <span>{plantilla.tipo === "SISTEMA" ? "Sistema" : "Personal"}</span>
                    {plantilla.unidad ? <span>{plantilla.unidad}</span> : null}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
        {ocultarResultados ? (
          <p className="absolute inset-0 grid place-items-center bg-background/80 text-sm text-muted-foreground">
            Actualizando resultados…
          </p>
        ) : null}
      </div>
      {totalPaginas > 1 ? (
        <div className="flex items-center justify-between border-t p-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || cargando}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPaginas}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page + 1 >= totalPaginas || cargando}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </section>
  );
}
