import { useInsumoUsos } from "../hooks/useInsumoUsos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";

export function DialogoUsoInsumo({
  abierto,
  onClose,
  proyectoId,
  insumoId,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: string;
  insumoId: string;
}) {
  // Los usos se piden siempre a `GET /insumos/{id}/usos`. No venían nunca
  // "precargados" en el error de borrado: `ErrorPayload` son dos strings y no
  // puede transportar la lista.
  const { data: usos, isPending } = useInsumoUsos(proyectoId, insumoId, {
    habilitado: abierto,
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insumo en uso</DialogTitle>
          <DialogDescription>
            Este insumo está siendo usado y no puede eliminarse.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <CargandoTabla filas={3} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Bloque</TableHead>
                <TableHead>Precio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usos?.map((u) => (
                <TableRow key={u.apuId}>
                  <TableCell className="font-mono text-xs">{u.codigo}</TableCell>
                  <TableCell>{u.descripcion}</TableCell>
                  <TableCell className="font-mono text-xs">{u.bloque}</TableCell>
                  {/* `override` explica por qué no se puede borrar (S-19). */}
                  <TableCell className="text-xs text-muted-foreground">
                    {u.override ? "Manual" : "Heredado"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
