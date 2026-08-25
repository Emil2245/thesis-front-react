import { useState } from "react";
import { Input } from "@/components/ui/input";
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
import { useAdminLogs } from "../hooks/useAdminLogs";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { SearchIcon } from "lucide-react";

// El backend no tiene /admin/logs todavía (plan 027). Para reactivar: borra
// este bloque, quita "admin" de MODULOS_SIN_BACKEND (si ya no aplica al resto
// del grupo) y exporta AdminLogsPageActiva como AdminLogsPage.
export function AdminLogsPage() {
  return (
    <>
      <EncabezadoPagina titulo="Registro de actividades" />
      <ModuloNoDisponible
        modulo="El registro de actividades"
        descripcion="El servidor todavía no expone el registro de actividades del sistema. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function AdminLogsPageActiva() {
  const [filtroEvento, setFiltroEvento] = useState("");
  const { data, isPending } = useAdminLogs(filtroEvento ? { evento: filtroEvento } : undefined);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Registro de actividades</h1>
      <div className="relative w-72">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Filtrar por evento..."
          value={filtroEvento}
          onChange={(e) => setFiltroEvento(e.target.value)}
        />
      </div>
      {isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.contenido.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-sm">{l.usuarioNombre}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {l.evento}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                  {JSON.stringify(l.detalle)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(l.fecha).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
