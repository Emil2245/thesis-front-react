import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ConfirmarDestructivo({
  titulo,
  descripcion,
  textoConfirmar = "Eliminar",
  onConfirmar,
  children,
  abierto,
  onAbiertoChange,
}: {
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  onConfirmar: () => void;
  /** Modo trigger: el elemento que abre el diálogo. */
  children?: ReactNode;
  /** Modo controlado: la página gobierna la apertura. Requiere `onAbiertoChange`. */
  abierto?: boolean;
  onAbiertoChange?: (v: boolean) => void;
}) {
  const controlado = abierto !== undefined;
  return (
    <AlertDialog {...(controlado ? { open: abierto, onOpenChange: onAbiertoChange } : {})}>
      {children ? <AlertDialogTrigger asChild>{children}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{textoConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
