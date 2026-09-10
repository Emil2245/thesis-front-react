import { useMemo, useState } from "react";
import type { CapituloResponse } from "@/api/contract";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogoAgregarItem } from "@/features/presupuesto/components/DialogoAgregarItem";
import { useRubroMutaciones } from "@/features/presupuesto/hooks/useRubroMutaciones";
import { DialogoNuevoApu } from "@/features/apu-editor/components/DialogoNuevoApu";

interface DialogoAgregarApuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presupuestoId: string;
  proyectoId: string;
  capitulos: CapituloResponse[];
  defaultCapituloId?: string;
}

function aplanarCapitulos(capitulos: CapituloResponse[]): CapituloResponse[] {
  return capitulos.flatMap((capitulo) => [capitulo, ...aplanarCapitulos(capitulo.subcapitulos)]);
}

export function DialogoAgregarApu({
  open,
  onOpenChange,
  presupuestoId,
  proyectoId,
  capitulos,
  defaultCapituloId,
}: DialogoAgregarApuProps) {
  const opcionesCapitulo = useMemo(() => aplanarCapitulos(capitulos), [capitulos]);
  const defaultValido =
    defaultCapituloId && opcionesCapitulo.some((capitulo) => capitulo.id === defaultCapituloId)
      ? defaultCapituloId
      : (opcionesCapitulo[0]?.id ?? "");
  const [capituloId, setCapituloId] = useState(defaultValido);
  const [origen, setOrigen] = useState<"seleccion" | "existente" | "nuevo">("seleccion");
  const { agregar } = useRubroMutaciones(presupuestoId);

  const cerrar = () => {
    setOrigen("seleccion");
    onOpenChange(false);
  };

  const elegirOrigen = (next: "existente" | "nuevo") => {
    if (capituloId) setOrigen(next);
  };

  const vincular = (apuId: string, cantidad = "1.000000") => {
    if (!capituloId) return;
    agregar.mutate({ capituloId, apuId, cantidad });
    cerrar();
  };

  return (
    <>
      <Dialog
        open={open && origen === "seleccion"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) cerrar();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar APU</DialogTitle>
            <DialogDescription>
              Selecciona dónde quedará el rubro y el origen del APU.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="destino-capitulo">Capítulo de destino</Label>
              <Select
                value={capituloId}
                onValueChange={setCapituloId}
                disabled={!opcionesCapitulo.length}
              >
                <SelectTrigger id="destino-capitulo" aria-label="Capítulo de destino">
                  <SelectValue placeholder="Seleccionar capítulo" />
                </SelectTrigger>
                <SelectContent>
                  {opcionesCapitulo.map((capitulo) => (
                    <SelectItem key={capitulo.id} value={capitulo.id}>
                      {capitulo.item} · {capitulo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start whitespace-normal p-3 text-left"
                onClick={() => elegirOrigen("existente")}
                disabled={!capituloId}
              >
                <span>
                  <span className="block font-medium">Usar APU existente</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Buscarlo en la versión actual.
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                className="h-auto justify-start whitespace-normal p-3 text-left"
                onClick={() => elegirOrigen("nuevo")}
                disabled={!capituloId}
              >
                <span>
                  <span className="block font-medium">Crear APU</span>
                  <span className="block text-xs font-normal opacity-80">
                    Desde cero o una plantilla.
                  </span>
                </span>
              </Button>
            </div>
            {!opcionesCapitulo.length && (
              <output className="block text-sm text-muted-foreground">
                Debe crear un capítulo antes de agregar un APU.
              </output>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogoAgregarItem
        open={open && origen === "existente"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setOrigen("seleccion");
        }}
        onConfirm={(apuId, cantidad) => vincular(apuId, cantidad)}
        presupuestoId={presupuestoId}
      />

      <DialogoNuevoApu
        abierto={open && origen === "nuevo"}
        onClose={() => setOrigen("seleccion")}
        presupuestoId={presupuestoId}
        proyectoId={proyectoId}
        onCreate={(apuId) => vincular(apuId)}
      />
    </>
  );
}
