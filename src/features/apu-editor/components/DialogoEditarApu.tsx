import { useState } from "react";
import { EditorApu } from "./EditorApu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function DialogoEditarApu({
  apuId,
  proyectoId,
  presupuestoId,
  onClose,
  onRestaurarFoco,
}: {
  apuId: string;
  proyectoId: string;
  presupuestoId?: string;
  onClose: () => void;
  onRestaurarFoco?: () => void;
}) {
  const [estado, setEstado] = useState({ borrador: false, guardando: false });
  const [confirmar, setConfirmar] = useState(false);
  const solicitarCierre = () => {
    if (estado.guardando) return;
    if (estado.borrador) setConfirmar(true);
    else onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) solicitarCierre();
      }}
    >
      <DialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestaurarFoco?.();
        }}
        showCloseButton={false}
        className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-2.5">
          <DialogTitle className="text-base">Editar APU</DialogTitle>
          <DialogDescription>Edita la composición sin salir del workspace.</DialogDescription>
        </DialogHeader>
        <div className="scrollbar-discreet min-h-0 flex-1 space-y-3 overflow-auto p-3 [&_.rounded-xl>div.border-b]:h-9 [&_.rounded-xl>div.border-b]:px-3 [&_.rounded-xl>p]:py-3 [&_table_td]:px-1.5 [&_table_th]:h-7 [&_table_th]:px-1.5 [&_table_th:not(:first-child)]:w-px [&_table_th:not(:first-child)]:whitespace-nowrap">
          <EditorApu
            compact
            apuId={apuId}
            proyectoId={proyectoId}
            presupuestoId={presupuestoId}
            onEstadoCambio={setEstado}
          />
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/50 px-4 py-2">
          <output className="text-xs text-muted-foreground">
            {estado.guardando
              ? "Guardando cambios…"
              : "Las celdas se guardan al salir o pulsar Enter. El encabezado y la especificación técnica tienen su propio botón Guardar."}
          </output>
          <Button size="sm" variant="outline" disabled={estado.guardando} onClick={solicitarCierre}>
            Cerrar
          </Button>
        </footer>
        <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Descartar cambios sin guardar?</AlertDialogTitle>
              <AlertDialogDescription>
                Se perderán los borradores del encabezado o de la especificación técnica. Las celdas
                ya guardadas se conservarán.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Seguir editando</AlertDialogCancel>
              <AlertDialogAction onClick={onClose}>Descartar y cerrar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
