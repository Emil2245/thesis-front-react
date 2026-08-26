import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DialogoConfirmarReduccionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  periodosAfectados: string[];
}

export function DialogoConfirmarReduccion({
  open,
  onOpenChange,
  onConfirm,
  periodosAfectados,
}: DialogoConfirmarReduccionProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar reducción de períodos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {periodosAfectados.length > 0
            ? "Los avances asignados en los siguientes períodos se perderán:"
            : "Se perderán avances en períodos que se eliminen."}
        </p>
        {periodosAfectados.length > 0 && (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {periodosAfectados.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
