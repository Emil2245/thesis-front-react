import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ApiError } from "@/api/problem";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useLogsActividad } from "../hooks/useLogsActividad";

/**
 * Convierte una fecha de calendario (`<input type="date">`, `yyyy-MM-dd`) en
 * el límite del día en UTC que el backend espera como `Instant`. `desde` toma
 * el inicio del día; `hasta`, el final, para que un filtro de un solo día
 * incluya todo lo ocurrido en él.
 */
const inicioDeDia = (fecha: string) => `${fecha}T00:00:00.000Z`;
const finDeDia = (fecha: string) => `${fecha}T23:59:59.999Z`;

/** Sólo lectura (§09 del plan 080): no hay alta, edición ni borrado aquí. */
export function AdminLogsPageActiva() {
  const [usuarioId, setUsuarioId] = useState("");
  const [evento, setEvento] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(0);

  const {
    data: logs,
    isPending,
    isError,
    error,
  } = useLogsActividad({
    usuarioId,
    evento,
    desde: desde ? inicioDeDia(desde) : undefined,
    hasta: hasta ? finDeDia(hasta) : undefined,
    page,
    size: 25,
  });

  const filtros = (
    <div className="flex flex-wrap items-end gap-4">
      <Field>
        <Label htmlFor="logs-usuario-id">ID de usuario</Label>
        <Input
          id="logs-usuario-id"
          placeholder="UUID del usuario"
          value={usuarioId}
          onChange={(e) => {
            setUsuarioId(e.target.value);
            setPage(0);
          }}
          className="w-64"
        />
      </Field>
      <Field>
        <Label htmlFor="logs-evento">Evento</Label>
        <Input
          id="logs-evento"
          placeholder="p. ej. auth.login"
          value={evento}
          onChange={(e) => {
            setEvento(e.target.value);
            setPage(0);
          }}
          className="w-48"
        />
      </Field>
      <Field>
        <Label htmlFor="logs-desde">Desde</Label>
        <Input
          id="logs-desde"
          type="date"
          value={desde}
          onChange={(e) => {
            setDesde(e.target.value);
            setPage(0);
          }}
        />
      </Field>
      <Field>
        <Label htmlFor="logs-hasta">Hasta</Label>
        <Input
          id="logs-hasta"
          type="date"
          value={hasta}
          onChange={(e) => {
            setHasta(e.target.value);
            setPage(0);
          }}
        />
      </Field>
    </div>
  );

  if (isPending)
    return (
      <>
        <EncabezadoPagina titulo="Registro de actividades" />
        {filtros}
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  if (isError)
    return (
      <>
        <EncabezadoPagina titulo="Registro de actividades" />
        {filtros}
        <EstadoVacio
          titulo="No se pudo cargar el registro de actividades"
          descripcion={error instanceof ApiError ? error.problem.mensaje : "Intenta de nuevo."}
        />
      </>
    );

  return (
    <>
      <EncabezadoPagina titulo="Registro de actividades" />
      {filtros}

      <TarjetaTabla
        pie={
          logs.totalPaginas > 1 || page > 0 ? (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <Button
                    aria-label="Página anterior"
                    variant="outline"
                    size="icon-sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeftIcon />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    aria-label="Página siguiente"
                    variant="outline"
                    size="icon-sm"
                    disabled={page >= logs.totalPaginas - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : undefined
        }
      >
        {logs.contenido.length === 0 ? (
          <EstadoVacio
            titulo="Sin actividad registrada"
            descripcion="No hay eventos que coincidan con los filtros aplicados."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.contenido.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.usuarioNombre ?? "Sistema"}</TableCell>
                  <TableCell>{log.evento}</TableCell>
                  <TableCell>{log.entidad}</TableCell>
                  <TableCell className="max-w-xs truncate font-mono text-xs">
                    {JSON.stringify(log.detalle)}
                  </TableCell>
                  <TableCell>{new Date(log.fecha).toLocaleString("es-EC")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TarjetaTabla>
    </>
  );
}
