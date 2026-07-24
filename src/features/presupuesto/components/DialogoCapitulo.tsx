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

interface DialogoCapituloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (descripcion: string) => void;
  titulo: string;
  valorInicial?: string;
}

export function DialogoCapitulo({
  open,
  onOpenChange,
  onConfirm,
  titulo,
  valorInicial = "",
}: DialogoCapituloProps) {
  const [descripcion, setDescripcion] = useState(valorInicial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Nombre del capítulo"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(descripcion);
              setDescripcion("");
            }}
            disabled={!descripcion.trim()}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
