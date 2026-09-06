import { useState } from "react";
import { useGuardarPlantilla } from "../hooks/usePlantillas";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";

interface DialogoGuardarPlantillaProps {
  abierto: boolean;
  onClose: () => void;
  apuId: string;
}

export function DialogoGuardarPlantilla({ abierto, onClose, apuId }: DialogoGuardarPlantillaProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  // El POST va por el hook, no por `post` en línea: es el que invalida la lista
  // de «Mis plantillas», que desde el plan 048 es una pantalla de verdad.
  const guardar = useGuardarPlantilla(apuId);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    try {
      await guardar.mutateAsync({
        nombre: nombre.trim(),
        descripcionRubro: descripcion.trim() || undefined,
      });
      toast.success("Plantilla guardada. Puedes verla en Mis plantillas.");
      setNombre("");
      setDescripcion("");
      onClose();
    } catch {
      setError("Error al guardar la plantilla");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
          <DialogDescription>
            Guarda este APU como plantilla para usarlo en otros proyectos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <Label htmlFor="plantilla-nombre">Nombre *</Label>
            <Input
              id="plantilla-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGuardar();
              }}
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- dialog primary input
              autoFocus
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>

          <Field>
            <Label htmlFor="plantilla-descripcion">Descripción (opcional)</Label>
            <Input
              id="plantilla-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>

          <p className="text-[10px] text-muted-foreground">
            La plantilla guarda insumos, cantidades y rendimientos, pero no los precios: al usarla,
            los precios se toman de la base de insumos del proyecto.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleGuardar} disabled={guardar.isPending}>
            {guardar.isPending ? "Guardando…" : "Guardar plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
