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
import { PlusIcon, Trash2Icon } from "lucide-react";

export function AdminBasesPage() {
  const { data, isPending } = useAdminBases();
  const crear = useCrearBase();
  const eliminar = useEliminarBase();

  if (isPending)
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bases de insumos</h1>
        <Button onClick={() => crear.mutate({ nombre: `Base ${Date.now()}` })}>
          <PlusIcon /> Nueva base
        </Button>
      </div>
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
              <TableCell className="font-mono text-sm">{b.insumoCount}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => eliminar.mutate(b.id)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
