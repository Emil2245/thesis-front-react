import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBases, useCrearBase, useEliminarBase } from "../hooks/useAdminBases";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { PlusIcon, Trash2Icon } from "lucide-react";

// El backend no tiene /admin/bases todavía (plan 027). Para reactivar: borra
// este bloque, quita "admin" de MODULOS_SIN_BACKEND (si ya no aplica al resto
// del grupo) y exporta AdminBasesPageActiva como AdminBasesPage.
export function AdminBasesPage() {
  return (
    <>
      <EncabezadoPagina titulo="Bases de insumos" />
      <ModuloNoDisponible
        modulo="La administración de bases de insumos"
        descripcion="El servidor todavía no expone la administración de bases centrales. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function AdminBasesPageActiva() {
  const { data, isPending } = useAdminBases();
  const crear = useCrearBase();
  const eliminar = useEliminarBase();

  if (isPending)
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  return (
    <>
      <EncabezadoPagina
        titulo="Bases de insumos"
        acciones={
          <Button onClick={() => crear.mutate({ nombre: `Base ${Date.now()}` })}>
            <PlusIcon data-icon="inline-start" /> Nueva base
          </Button>
        }
      />
      <TarjetaTabla>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Insumos</TableHead>
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.contenido.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell>{b.archivada ? "Archivada" : "Activa"}</TableCell>
                <TableCell className="font-mono text-sm">{b.totalInsumos}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => eliminar.mutate(b.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TarjetaTabla>
    </>
  );
}
