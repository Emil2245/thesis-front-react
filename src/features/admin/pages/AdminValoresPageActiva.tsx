import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { ApiError } from "@/api/problem";
import type { ValorReferenciaResponse } from "@/api/contract";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  useValoresReferencia,
  useGuardarValorReferencia,
  useEliminarValorReferencia,
} from "../hooks/useValoresReferencia";

/**
 * Alta y edición comparten diálogo: el `PUT` es el mismo upsert (§9bis del
 * plan 079), sólo cambia si la clave se puede escribir. Al editar la clave ya
 * la fija el path de la petición, así que se muestra de sólo lectura — nunca
 * viaja en el cuerpo.
 *
 * Los tres campos son `@NotBlank` en el backend y sus mensajes de error son
 * slugs (`valor-requerido`, no prosa en español): se valida aquí para que esa
 * petición nunca salga vacía, en vez de traducir el slug después.
 */
function DialogoValor({
  valorExistente,
  onClose,
  onGuardar,
}: {
  valorExistente: ValorReferenciaResponse | null;
  onClose: () => void;
  onGuardar: (datos: { clave: string; valor: string; descripcion: string; fuente: string }) => Promise<unknown>;
}) {
  const [clave, setClave] = useState(valorExistente?.clave ?? "");
  const [valor, setValor] = useState(valorExistente?.valor ?? "");
  const [descripcion, setDescripcion] = useState(valorExistente?.descripcion ?? "");
  const [fuente, setFuente] = useState(valorExistente?.fuente ?? "");
  const [errorGeneral, setErrorGeneral] = useState("");

  const invalido =
    clave.trim() === "" || valor.trim() === "" || descripcion.trim() === "" || fuente.trim() === "";

  async function enviar() {
    if (invalido) return;
    setErrorGeneral("");
    try {
      await onGuardar({
        clave: clave.trim(),
        valor: valor.trim(),
        descripcion: descripcion.trim(),
        fuente: fuente.trim(),
      });
      onClose();
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.problem.mensaje : "Error al guardar el valor");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{valorExistente ? "Editar valor de referencia" : "Nuevo valor de referencia"}</DialogTitle>
        </DialogHeader>
        {errorGeneral ? <p className="text-sm text-destructive">{errorGeneral}</p> : null}
        <div className="space-y-4">
          <Field>
            <Label htmlFor="valor-referencia-clave">Clave</Label>
            <Input
              id="valor-referencia-clave"
              value={clave}
              maxLength={50}
              disabled={!!valorExistente}
              onChange={(e) => setClave(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="valor-referencia-valor">Valor</Label>
            <Input
              id="valor-referencia-valor"
              value={valor}
              maxLength={100}
              onChange={(e) => setValor(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="valor-referencia-descripcion">Descripción</Label>
            <Input
              id="valor-referencia-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="valor-referencia-fuente">Fuente</Label>
            <Input
              id="valor-referencia-fuente"
              value={fuente}
              maxLength={200}
              onChange={(e) => setFuente(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={invalido} onClick={enviar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminValoresPageActiva() {
  const [page, setPage] = useState(0);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<ValorReferenciaResponse | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  const { data: valores, isPending, isError, error } = useValoresReferencia({ page, size: 25 });
  const guardar = useGuardarValorReferencia();
  const eliminar = useEliminarValorReferencia();

  if (isPending)
    return (
      <>
        <EncabezadoPagina titulo="Valores de referencia" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  if (isError)
    return (
      <>
        <EncabezadoPagina titulo="Valores de referencia" />
        <EstadoVacio
          titulo="No se pudo cargar la lista de valores de referencia"
          descripcion={error instanceof ApiError ? error.problem.mensaje : "Intenta de nuevo."}
        />
      </>
    );

  async function manejarEliminar(clave: string) {
    setErrorEliminar("");
    try {
      await eliminar.mutateAsync(clave);
      setPage(0);
    } catch (e) {
      setErrorEliminar(e instanceof ApiError ? e.problem.mensaje : "Error al eliminar el valor");
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Valores de referencia"
        acciones={
          <Button onClick={() => setCreando(true)}>
            <PlusIcon data-icon="inline-start" /> Nuevo valor
          </Button>
        }
      />

      {errorEliminar ? <p className="text-sm text-destructive">{errorEliminar}</p> : null}

      <TarjetaTabla
        pie={
          valores.totalPaginas > 1 || page > 0 ? (
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
                    disabled={page >= valores.totalPaginas - 1}
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
        {valores.contenido.length === 0 ? (
          <EstadoVacio
            titulo="Sin valores de referencia"
            descripcion="Todavía no hay valores de referencia registrados."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clave</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Actualizado</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valores.contenido.map((v) => (
                <TableRow key={v.clave}>
                  <TableCell className="font-medium">{v.clave}</TableCell>
                  <TableCell>{v.valor}</TableCell>
                  <TableCell>{v.descripcion}</TableCell>
                  <TableCell>{v.fuente}</TableCell>
                  <TableCell>{new Date(v.actualizado).toLocaleDateString("es-EC")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => setEditando(v)}
                    >
                      <PencilIcon />
                    </Button>
                    <ConfirmarDestructivo
                      titulo="Eliminar valor de referencia"
                      descripcion={`¿Eliminar "${v.clave}"?`}
                      textoConfirmar="Eliminar valor"
                      onConfirmar={() => manejarEliminar(v.clave)}
                    >
                      <Button variant="ghost" size="icon" title="Eliminar" className="text-destructive">
                        <Trash2Icon />
                      </Button>
                    </ConfirmarDestructivo>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TarjetaTabla>

      {creando && (
        <DialogoValor
          valorExistente={null}
          onClose={() => setCreando(false)}
          onGuardar={(datos) => guardar.mutateAsync(datos)}
        />
      )}
      {editando && (
        <DialogoValor
          valorExistente={editando}
          onClose={() => setEditando(null)}
          onGuardar={(datos) => guardar.mutateAsync(datos)}
        />
      )}
    </>
  );
}
