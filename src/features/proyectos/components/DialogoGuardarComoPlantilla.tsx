import { useState } from "react";
import { useGuardarPlantillaProyecto } from "@/features/plantillas-proyecto/hooks/usePlantillasProyecto";
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

export function DialogoGuardarComoPlantilla({
  abierto,
  onClose,
  proyectoId,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: string;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarPlantillaProyecto(proyectoId);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    await guardar.mutateAsync({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
    });
    setNombre("");
    setDescripcion("");
    onClose();
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Guardar como plantilla</DialogTitle>
          <DialogDescription>
            Guarda este proyecto como plantilla para crear nuevos proyectos a partir de él.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <Label htmlFor="plantilla-proyecto-nombre">Nombre *</Label>
            <Input
              id="plantilla-proyecto-nombre"
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
            <Label htmlFor="plantilla-proyecto-descripcion">Descripción (opcional)</Label>
            <Input
              id="plantilla-proyecto-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
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
