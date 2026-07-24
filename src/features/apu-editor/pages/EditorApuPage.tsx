import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApuEditor } from "../hooks/useApuEditor";
import { EncabezadoApu } from "../components/EncabezadoApu";
import { GridSeccion } from "../components/GridSeccion";
import { PieTotales } from "../components/PieTotales";
import { DialogoDescuentoRubro } from "../components/DialogoDescuentoRubro";
import { DialogoGuardarPlantilla } from "../components/DialogoGuardarPlantilla";
import { PopoverDesglose } from "../components/PopoverDesglose";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";

export function EditorApuPage() {
  const { id, apuId } = useParams<{ id: string; apuId: string }>();
  const presupuestoId = Number(id);
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
    alternarAuxiliar,
  } = useApuEditor(parsedApuId, presupuestoId);

  const [descuentoDialogAbierto, setDescuentoDialogAbierto] = useState(false);
  const [guardarPlantillaDialogAbierto, setGuardarPlantillaDialogAbierto] = useState(false);
  const [desgloseAbierto, setDesgloseAbierto] = useState(false);

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
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
    <div className="space-y-6">
      <EncabezadoApu apu={apu} onEditar={editarEncabezado} onAlternarAuxiliar={alternarAuxiliar} />

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
        <Button variant="outline" size="sm" onClick={() => setGuardarPlantillaDialogAbierto(true)}>
          <SaveIcon /> Guardar como plantilla
        </Button>
      </div>

      <PieTotales
        apu={apu}
        onEditarPorcentajeCi={editarPorcentajeCi}
        onAbrirDescuento={() => setDescuentoDialogAbierto(true)}
        onAbrirDesglose={() => setDesgloseAbierto(true)}
      />

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
    </div>
  );
}
