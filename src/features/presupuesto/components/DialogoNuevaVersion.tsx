import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PresupuestoVersionResponse } from "@/api/contract";

interface DialogoNuevaVersionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (versionOrigenId: number, notas?: string) => void;
  versiones: PresupuestoVersionResponse[];
}

export function DialogoNuevaVersion({
  open,
  onOpenChange,
  onConfirm,
  versiones,
}: DialogoNuevaVersionProps) {
  const [versionOrigenId, setVersionOrigenId] = useState<string>("");
  const [notas, setNotas] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva versión del presupuesto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Versión origen</Label>
            <Select value={versionOrigenId} onValueChange={setVersionOrigenId}>
              <SelectTrigger aria-label="Versión origen">
                <SelectValue placeholder="Seleccionar versión origen" />
              </SelectTrigger>
              <SelectContent>
                {versiones.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    v{v.numero} {v.vigente ? "(vigente)" : ""} —{" "}
                    {new Date(v.fechaCreacion).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Input
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Motivo de la nueva versión"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (versionOrigenId) {
                onConfirm(Number(versionOrigenId), notas || undefined);
                setNotas("");
                setVersionOrigenId("");
              }
            }}
            disabled={!versionOrigenId}
          >
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
