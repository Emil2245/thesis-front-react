import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPlantillas,
  useCrearPlantillaSistema,
  useEliminarPlantillaSistema,
} from "../hooks/useAdminPlantillas";
import { PlusIcon, Trash2Icon } from "lucide-react";

export function AdminPlantillasPage() {
  const { data, isPending } = useAdminPlantillas();
  const crear = useCrearPlantillaSistema();
  const eliminar = useEliminarPlantillaSistema();

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
        <h1 className="text-xl font-semibold">Plantillas del sistema</h1>
        <Button
          onClick={() =>
            crear.mutate({ nombre: `Plantilla ${Date.now()}`, descripcion: "Nueva plantilla" })
          }
        >
          <PlusIcon /> Nueva plantilla
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-16 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.nombre}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{p.descripcion}</TableCell>
              <TableCell>
                <Badge variant="secondary">{p.tipo}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.fechaCreacion).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => eliminar.mutate(p.id)}
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
