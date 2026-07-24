import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
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
import { formatearNumero } from "@/lib/decimal";
import type { InsumoUsoResponse } from "@/api/contract";

export function DialogoUsoInsumo({
  abierto,
  onClose,
  proyectoId,
  insumoId,
  usosPrecargados,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: number;
  insumoId: number;
  usosPrecargados?: InsumoUsoResponse[];
}) {
  const { data: usos, isPending } = useQuery({
    queryKey: qk.insumoUso(proyectoId, insumoId),
    queryFn: () => get<InsumoUsoResponse[]>(`/proyectos/${proyectoId}/insumos/${insumoId}/uso`),
    enabled: !usosPrecargados && abierto,
    initialData: usosPrecargados,
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
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usos?.map((u) => (
                <TableRow key={u.detalleId}>
                  <TableCell className="font-mono text-xs">{u.apuCodigo}</TableCell>
                  <TableCell>{u.apuDescripcion}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearNumero(u.cantidad)}
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
