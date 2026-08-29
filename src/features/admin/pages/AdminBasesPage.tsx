import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminBases, useCrearBase, useEliminarBase, useArchivarBase } from "../hooks/useAdminBases";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { ArchiveIcon, ArchiveRestoreIcon, PlusIcon, Trash2Icon } from "lucide-react";

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
  const [incluirArchivadas, setIncluirArchivadas] = useState(true);
  const { data, isPending } = useAdminBases({ incluirArchivadas });
  const crear = useCrearBase();
  const eliminar = useEliminarBase();
  const archivar = useArchivarBase();

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
      <div className="flex items-center gap-2 mb-4">
        <Switch id="incluir-archivadas" checked={incluirArchivadas} onCheckedChange={setIncluirArchivadas} />
        <Label htmlFor="incluir-archivadas">Incluir archivadas</Label>
      </div>
      <TarjetaTabla>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Insumos</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.contenido.map((b) => (
              <TableRow key={b.id} className={cn(b.archivada && "opacity-50")}>
                <TableCell className="font-medium">
                  {b.nombre}
                  {b.archivada && <Badge variant="outline" className="ml-2">Archivada</Badge>}
                </TableCell>
                <TableCell>{b.archivada ? "Archivada" : "Activa"}</TableCell>
                <TableCell className="font-mono text-sm">{b.totalInsumos}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={b.archivada ? "Restaurar" : "Archivar"}
                    onClick={() => archivar.mutate(b.id)}
                  >
                    {b.archivada ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                  </Button>
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
