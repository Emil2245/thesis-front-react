import { useState } from "react";
import { AlertTriangleIcon, DownloadIcon, Loader2 } from "lucide-react";

import type { ActividadCronogramaResponse, FormatoExportCronograma } from "@/api/contract";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useExportar, usePreflightCronograma } from "@/features/exportar/hooks/useExportar";
import { cn } from "@/lib/utils";
import { BloqueosCronograma } from "./BloqueosCronograma";

const FORMATOS: { valor: FormatoExportCronograma; etiqueta: string }[] = [
  { valor: "xlsx", etiqueta: "Excel (.xlsx)" },
  { valor: "pdf", etiqueta: "PDF (.pdf)" },
  { valor: "mspdi", etiqueta: "MS Project (.xml)" },
];

const textoPendientes = (n: number) =>
  n === 1 ? "1 actividad por asignar" : `${n} actividades por asignar`;

/**
 * Descarga desde el propio Gantt. El preflight del servidor decide si se
 * puede; mientras no, la etiqueta dice cuántas actividades faltan y el botón
 * queda apagado explicando por qué. La lista nombra cada actividad para ir
 * directo a asignarla.
 */
export function DescargaCronograma({
  presupuestoId,
  actividades,
  onIrAActividad,
}: {
  presupuestoId: string;
  actividades: ActividadCronogramaResponse[];
  onIrAActividad: (actividad: ActividadCronogramaResponse) => void;
}) {
  const [listaAbierta, setListaAbierta] = useState(false);
  const [descargando, setDescargando] = useState<FormatoExportCronograma | null>(null);
  const { descargarCronograma } = useExportar();
  // XLSX y PDF comparten reglas; MSPDI añade la fecha de inicio del proyecto.
  const general = usePreflightCronograma(presupuestoId, "xlsx");
  const mspdi = usePreflightCronograma(presupuestoId, "mspdi");
  const pendientes =
    general.data?.bloqueos.filter((b) => b.codigo === "cronograma-desviacion").length ?? 0;
  const bloqueado = general.data?.exportable === false;

  const descargar = async (formato: FormatoExportCronograma) => {
    setDescargando(formato);
    await descargarCronograma(presupuestoId, formato);
    setDescargando(null);
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Popover open={listaAbierta} onOpenChange={setListaAbierta}>
        {/* La etiqueta es también el ancla de la lista cuando se abre desde el
            botón de descarga apagado. */}
        {bloqueado && (
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-advertencia/15 px-2.5 text-xs font-medium text-advertencia-texto hover:bg-advertencia/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
              {pendientes > 0 ? textoPendientes(pendientes) : "No se puede exportar aún"}
            </button>
          </PopoverTrigger>
        )}
        <PopoverContent align="end" className="w-80">
          <p className="font-medium">Completa el cronograma para descargarlo</p>
          {general.data && (
            <BloqueosCronograma
              bloqueos={general.data.bloqueos}
              actividades={actividades}
              onSeleccionarActividad={(actividad) => {
                setListaAbierta(false);
                onIrAActividad(actividad);
              }}
            />
          )}
        </PopoverContent>
      </Popover>

      {bloqueado || !general.data ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* `aria-disabled`, no `disabled`: un botón deshabilitado no recibe
                eventos, así que ni se vería el tooltip ni el clic llevaría a la
                lista de pendientes. */}
            <button
              type="button"
              aria-disabled="true"
              aria-label={
                bloqueado
                  ? `Descargar cronograma: no disponible, ${
                      pendientes > 0 ? textoPendientes(pendientes) : "hay bloqueos"
                    }`
                  : "Descargar cronograma: comprobando si se puede exportar"
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" }),
                "cursor-not-allowed opacity-50",
              )}
              onClick={() => bloqueado && setListaAbierta(true)}
            >
              {general.isLoading ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
            </button>
          </TooltipTrigger>
          {bloqueado && (
            <TooltipContent>
              {pendientes > 0
                ? `Asigna en el cronograma ${pendientes === 1 ? "la actividad pendiente" : `las ${pendientes} actividades pendientes`} para descargar`
                : "Resuelve los bloqueos para descargar"}
            </TooltipContent>
          )}
        </Tooltip>
      ) : (
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label="Descargar cronograma">
                  {descargando ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Descargar cronograma</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-56 gap-1 p-1">
            {FORMATOS.map(({ valor, etiqueta }) => {
              const preflight = valor === "mspdi" ? mspdi.data : general.data;
              return (
                <div key={valor}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    disabled={!preflight?.exportable || descargando !== null}
                    onClick={() => void descargar(valor)}
                  >
                    {descargando === valor ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <DownloadIcon />
                    )}
                    {etiqueta}
                  </Button>
                  {preflight && !preflight.exportable && (
                    <p className="px-2 pb-1 text-xs text-muted-foreground">
                      {preflight.bloqueos.map((b) => b.detalle).join(" ")}
                    </p>
                  )}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
