import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApuEditor } from "../hooks/useApuEditor";
import { useVersionActiva } from "@/shell/contexto";
import { EncabezadoApu } from "../components/EncabezadoApu";
import { GridSeccion } from "../components/GridSeccion";
import { PieTotales } from "../components/PieTotales";
import { DialogoDescuentoRubro } from "../components/DialogoDescuentoRubro";
import { DialogoGuardarPlantilla } from "../components/DialogoGuardarPlantilla";
import { PopoverDesglose } from "../components/PopoverDesglose";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MOTIVO_SIN_BACKEND } from "@/lib/disponibilidad";
import { SaveIcon } from "lucide-react";

export function EditorApuPage() {
  // La versión la manda el selector de la barra superior; `:apuId` sí es de ruta.
  const { apuId } = useParams<{ apuId: string }>();
  const { presupuestoId: versionActiva } = useVersionActiva();
  const presupuestoId = versionActiva ?? 0;
  const parsedApuId = Number(apuId);

  const {
    apu,
    secciones,
    cargando,
    editarCelda,
    restaurarHerencia,
    eliminarFila,
    editarEncabezado,
    editarPorcentajeCi,
    aplicarDescuento,
  } = useApuEditor(parsedApuId, presupuestoId || undefined);

  const [descuentoDialogAbierto, setDescuentoDialogAbierto] = useState(false);
  const [guardarPlantillaDialogAbierto, setGuardarPlantillaDialogAbierto] = useState(false);
  const [desgloseAbierto, setDesgloseAbierto] = useState(false);

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
      <EncabezadoApu apu={apu} onEditar={editarEncabezado} />

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* Las secciones se editan a la izquierda; los totales quedan a la vista
            a la derecha en vez de al final del scroll. */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {secciones.map((seccion) => (
            <GridSeccion
              key={seccion.tipo}
              seccion={seccion}
              onEditarCelda={editarCelda}
              onRestaurarHerencia={restaurarHerencia}
              onEliminarFila={eliminarFila}
            />
          ))}

          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGuardarPlantillaDialogAbierto(true)}
                    disabled
                  >
                    <SaveIcon data-icon="inline-start" /> Guardar como plantilla
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="w-full shrink-0 xl:sticky xl:top-19 xl:w-80">
          <PieTotales
            apu={apu}
            onEditarPorcentajeCi={editarPorcentajeCi}
            onAbrirDescuento={() => setDescuentoDialogAbierto(true)}
            onAbrirDesglose={() => setDesgloseAbierto(true)}
          />
        </div>
      </div>

      <DialogoDescuentoRubro
        abierto={descuentoDialogAbierto}
        onClose={() => setDescuentoDialogAbierto(false)}
        apu={apu}
        onAplicarDescuento={aplicarDescuento}
      />

      <DialogoGuardarPlantilla
        abierto={guardarPlantillaDialogAbierto}
        onClose={() => setGuardarPlantillaDialogAbierto(false)}
        apuId={parsedApuId}
      />

      <PopoverDesglose
        abierto={desgloseAbierto}
        onClose={() => setDesgloseAbierto(false)}
        apuId={parsedApuId}
      />
    </>
  );
}
