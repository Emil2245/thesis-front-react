import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { CapituloResponse } from "@/api/contract";

interface DialogoMoverCapituloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (parentId: number | null, orden: number) => void;
  capitulo: CapituloResponse;
  capitulos: CapituloResponse[];
}

export function DialogoMoverCapitulo({
  open,
  onOpenChange,
  onConfirm,
  capitulo,
  capitulos,
}: DialogoMoverCapituloProps) {
  const [nuevoPadreId, setNuevoPadreId] = useState<string>("raiz");
  const [orden, setOrden] = useState("0");

  const capitulosDisponibles = capitulos.filter((c) => c.id !== capitulo.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover "{capitulo.descripcion}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mover a capítulo padre</Label>
            <Select value={nuevoPadreId} onValueChange={setNuevoPadreId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar capítulo padre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raiz">Raíz (sin padre)</SelectItem>
                {capitulosDisponibles.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.item} - {c.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orden">Orden</Label>
            <Input
              id="orden"
              type="number"
              min={0}
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(nuevoPadreId === "raiz" ? null : Number(nuevoPadreId), Number(orden));
            }}
          >
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
