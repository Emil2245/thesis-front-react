import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useVersiones, useComparacion } from "../hooks/usePresupuesto";
import { useVersionMutaciones } from "../hooks/useVersionMutaciones";
import { DialogoNuevaVersion } from "../components/DialogoNuevaVersion";
import { ComparadorVersiones } from "../components/ComparadorVersiones";
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { formatearMoneda } from "@/lib/decimal";

// El backend no expone /proyectos/{id}/presupuestos todavía (plan 027). Es el
// desbloqueo de mayor apalancamiento: sin él, el módulo APU del backend queda
// inalcanzable desde la interfaz. Para reactivar: borra este bloque, quita
// "versiones" de MODULOS_SIN_BACKEND y exporta VersionesPageActiva como
// VersionesPage.
export function VersionesPage() {
  return (
    <>
      <EncabezadoPagina titulo="Versiones del presupuesto" />
      <ModuloNoDisponible
        modulo="Las versiones del presupuesto"
        descripcion="El servidor todavía no expone la lista de versiones de un proyecto. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function VersionesPageActiva() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const pid = Number(proyectoId);

  const { data: versiones, isLoading } = useVersiones(pid);
  const { crear, marcarVigente, eliminar } = useVersionMutaciones(pid);

  const [nuevaDialog, setNuevaDialog] = useState(false);
  const [compararId, setCompararId] = useState<number | null>(null);
  const [versionAEliminar, setVersionAEliminar] = useState<number | null>(null);

  const { data: comparacion, isLoading: compLoading } = useComparacion(compararId ?? 0, undefined);

  const handleMarcarVigente = useCallback(
    (versionId: number) => {
      marcarVigente.mutate(versionId);
    },
    [marcarVigente],
  );

  const handleEliminar = useCallback((versionId: number) => {
    setVersionAEliminar(versionId);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Versiones del presupuesto</h1>
          <p className="text-sm text-muted-foreground">{versiones?.length ?? 0} versión(es)</p>
        </div>
        <Button onClick={() => setNuevaDialog(true)}>Nueva versión</Button>
      </div>

      {versiones && versiones.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Total general</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versiones.map((v) => (
              <TableRow key={v.id} className={v.vigente ? "bg-muted/50" : ""}>
                <TableCell className="font-mono">v{v.numero}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.notas || "—"}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatearMoneda(v.totalGeneral)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(v.fechaCreacion).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {v.vigente ? <Badge>Vigente</Badge> : <Badge variant="outline">Histórica</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!v.vigente && (
                      <Button variant="outline" size="sm" onClick={() => handleMarcarVigente(v.id)}>
                        Marcar vigente
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setCompararId(v.id)}>
                      Comparar
                    </Button>
                    {!v.vigente && (
                      <Button variant="destructive" size="sm" onClick={() => handleEliminar(v.id)}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ComparadorVersiones data={comparacion} isLoading={compLoading} />

      <DialogoNuevaVersion
        open={nuevaDialog}
        onOpenChange={setNuevaDialog}
        onConfirm={(versionOrigenId, notas) => {
          crear.mutate({ versionOrigenId, notas });
          setNuevaDialog(false);
        }}
        versiones={versiones ?? []}
      />

      <ConfirmarDestructivo
        abierto={versionAEliminar !== null}
        onAbiertoChange={(v) => {
          if (!v) setVersionAEliminar(null);
        }}
        titulo="Eliminar versión"
        descripcion="¿Eliminar esta versión? No se puede eliminar la versión vigente. Esta acción no se puede deshacer."
        onConfirmar={() => {
          if (versionAEliminar !== null) eliminar.mutate(versionAEliminar);
          setVersionAEliminar(null);
        }}
      />
    </div>
  );
}
