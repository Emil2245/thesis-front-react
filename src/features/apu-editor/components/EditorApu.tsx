import { useEffect, useRef, useState } from "react";
import { useApuEditor } from "../hooks/useApuEditor";
import { useParametrosCi } from "@/features/proyectos/hooks/useParametros";
import { EncabezadoApu } from "./EncabezadoApu";
import { GridSeccion } from "./GridSeccion";
import { SelectorInsumo } from "./SelectorInsumo";
import { PieTotales } from "./PieTotales";
import { DialogoGuardarPlantilla } from "./DialogoGuardarPlantilla";
import { PopoverDesglose } from "./PopoverDesglose";
import { PanelEspecificacionTecnica } from "./PanelEspecificacionTecnica";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { SeccionTipo } from "@/api/contract";
import { cn } from "@/lib/utils";
import { SaveIcon } from "lucide-react";

export function EditorApu({
  apuId: parsedApuId,
  proyectoId,
  presupuestoId,
  onEstadoCambio,
  compact = false,
}: {
  apuId: string;
  proyectoId: string;
  presupuestoId?: string;
  compact?: boolean;
  onEstadoCambio?: (estado: { borrador: boolean; guardando: boolean }) => void;
}) {
  const ciProyecto = useParametrosCi(proyectoId || null);
  const [encabezadoBorrador, setEncabezadoBorrador] = useState(false);
  const [etBorrador, setEtBorrador] = useState(false);
  const {
    apu,
    especificacionTecnica,
    secciones,
    cargando,
    guardando,
    error,
    agregarFila,
    editarCelda,
    restaurarHerencia,
    reordenarFila,
    eliminarFila,
    editarEncabezado,
    editarPorcentajeCi,
    guardarEspecificacionTecnica,
  } = useApuEditor(parsedApuId, presupuestoId || undefined);

  const [guardarPlantillaDialogAbierto, setGuardarPlantillaDialogAbierto] = useState(false);
  const [desgloseAbierto, setDesgloseAbierto] = useState(false);
  // Plan 074 §2: una sola instancia de `SelectorInsumo` sirve a las cuatro
  // secciones; guardamos el tipo activo y lo cambiamos al pulsar "Agregar insumo"
  // en cualquier grid. `null` significa diálogo cerrado. Mantener un único
  // diálogo evita apilar cuatro montajes separados y revalidaciones duplicadas.
  const nestedTriggerRef = useRef<HTMLElement | null>(null);
  const abrirDialogo = (abrir: () => void) => {
    nestedTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    abrir();
  };
  const restaurarFoco = () => nestedTriggerRef.current?.focus();
  const [selectorTipo, setSelectorTipo] = useState<SeccionTipo | null>(null);

  useEffect(() => {
    onEstadoCambio?.({ borrador: encabezadoBorrador || etBorrador, guardando });
  }, [onEstadoCambio, encabezadoBorrador, etBorrador, guardando]);

  if (cargando) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-14 w-full" />
        <div className="flex flex-col gap-5 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-72 w-full shrink-0 xl:w-80" />
        </div>
      </div>
    );
  }

  if (!apu) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <p className="text-muted-foreground">APU no encontrado</p>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert">{error.problem?.mensaje ?? "No se pudo guardar el cambio"}</p>}
      <div
        className={cn(
          compact && "[&>div]:gap-2 [&_h1]:text-base [&_h1]:whitespace-normal [&_h1]:wrap-anywhere",
        )}
      >
        <EncabezadoApu
          apu={apu}
          onEditar={editarEncabezado}
          onBorradorChange={setEncabezadoBorrador}
        />
      </div>

      <div className={cn("flex flex-col", compact ? "gap-3" : "gap-5 xl:flex-row xl:items-start")}>
        {/* Las secciones se editan a la izquierda; los totales quedan a la vista
            a la derecha en vez de al final del scroll. */}
        <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-2" : "gap-4")}>
          {secciones.map((seccion) => (
            <GridSeccion
              key={seccion.tipo}
              seccion={seccion}
              onEditarCelda={editarCelda}
              onRestaurarHerencia={restaurarHerencia}
              onEliminarFila={eliminarFila}
              onReordenarFila={reordenarFila}
              onAgregarInsumo={(tipo) => abrirDialogo(() => setSelectorTipo(tipo))}
            />
          ))}

          <PanelEspecificacionTecnica
            texto={especificacionTecnica}
            onBorradorChange={setEtBorrador}
            onGuardar={guardarEspecificacionTecnica}
          />

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => abrirDialogo(() => setGuardarPlantillaDialogAbierto(true))}
            >
              <SaveIcon data-icon="inline-start" /> Guardar como plantilla
            </Button>
          </div>
        </div>

        <div className={cn("w-full shrink-0", !compact && "xl:sticky xl:top-19 xl:w-80")}>
          <PieTotales
            apu={apu}
            onEditarPorcentajeCi={editarPorcentajeCi}
            onAbrirDesglose={() => abrirDialogo(() => setDesgloseAbierto(true))}
            ciIndividualHabilitado={
              !ciProyecto.isFetching &&
              !ciProyecto.isError &&
              ciProyecto.data?.ciIndividualHabilitado === true
            }
          />
        </div>
      </div>

      {selectorTipo !== null && (
        <SelectorInsumo
          abierto
          onClose={() => setSelectorTipo(null)}
          proyectoId={proyectoId}
          tipo={selectorTipo}
          onSeleccionar={agregarFila}
          onRestaurarFoco={restaurarFoco}
        />
      )}

      <DialogoGuardarPlantilla
        abierto={guardarPlantillaDialogAbierto}
        onClose={() => setGuardarPlantillaDialogAbierto(false)}
        onRestaurarFoco={restaurarFoco}
        apuId={parsedApuId}
      />

      <PopoverDesglose
        abierto={desgloseAbierto}
        onClose={() => setDesgloseAbierto(false)}
        onRestaurarFoco={restaurarFoco}
        apuId={parsedApuId}
      />
    </>
  );
}
