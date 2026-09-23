import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ConfirmarDestructivo } from "@/components/comunes/ConfirmarDestructivo";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { TarjetaTabla } from "@/components/comunes/TarjetaTabla";
import { ApiError } from "@/api/problem";
import type { PlantillaProyectoAdminResponse } from "@/api/contract";
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  usePlantillasProyectoAdmin,
  useCrearPlantillaProyectoAdmin,
  useEditarPlantillaProyectoAdmin,
  useEliminarPlantillaProyectoAdmin,
} from "../hooks/usePlantillasProyectoAdmin";
import { useProyectos } from "@/features/proyectos/hooks/useProyectos";

const mensajeDe = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.problem.mensaje : fallback;

/**
 * Alta de una plantilla de proyecto SISTEMA. Como en las plantillas APU, el
 * snapshot lo construye el backend desde un proyecto real: aquí sólo se elige
 * cuál. No hay listado global de proyectos, así que salen de `GET /proyectos`
 * (los del administrador).
 */
function DialogoCrear({ onClose }: { onClose: () => void }) {
  const [proyectoId, setProyectoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const proyectos = useProyectos();
  const crear = useCrearPlantillaProyectoAdmin();
  const lista = proyectos.data?.contenido ?? [];

  async function enviar() {
    setError("");
    try {
      await crear.mutateAsync({
        desdeProyectoId: proyectoId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(mensajeDe(e, "Error al crear plantilla"));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva plantilla de proyecto</DialogTitle>
          <DialogDescription>
            Copia la estructura del proyecto elegido: capítulos, rubros, APUs y parámetros, sin
            precios ni cantidades.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {proyectos.isSuccess && lista.length === 0 ? (
          <EstadoVacio
            titulo="No hay proyectos"
            descripcion="Crea un proyecto con la estructura que quieres publicar."
          />
        ) : (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="crear-pp-proyecto">Proyecto de origen</Label>
              <Select value={proyectoId} onValueChange={setProyectoId}>
                <SelectTrigger id="crear-pp-proyecto" className="w-full">
                  <SelectValue placeholder="Selecciona un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {lista.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombreProyecto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="crear-pp-nombre">Nombre</Label>
              <Input
                id="crear-pp-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="crear-pp-descripcion">Descripción</Label>
              <Textarea
                id="crear-pp-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={!proyectoId || nombre.trim() === "" || crear.isPending}
            onClick={enviar}
          >
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoEditar({
  plantilla,
  onClose,
}: {
  plantilla: PlantillaProyectoAdminResponse;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [descripcion, setDescripcion] = useState(plantilla.descripcion ?? "");
  const [error, setError] = useState("");
  const editar = useEditarPlantillaProyectoAdmin();

  async function enviar() {
    setError("");
    const cambios: { nombre?: string; descripcion?: string } = {};
    if (nombre.trim() !== plantilla.nombre) cambios.nombre = nombre.trim();
    if (descripcion !== (plantilla.descripcion ?? "")) cambios.descripcion = descripcion;
    if (Object.keys(cambios).length === 0) {
      onClose();
      return;
    }
    try {
      await editar.mutateAsync({ id: plantilla.id, ...cambios });
      onClose();
    } catch (e) {
      setError(mensajeDe(e, "Error al actualizar plantilla"));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar plantilla</DialogTitle>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="space-y-4">
          <Field>
            <Label htmlFor="editar-pp-nombre">Nombre</Label>
            <Input
              id="editar-pp-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="editar-pp-descripcion">Descripción</Label>
            <Textarea
              id="editar-pp-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={nombre.trim() === "" || editar.isPending} onClick={enviar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Plantillas de proyecto del sistema: las ve y usa todo usuario, sólo aquí se gestionan. */
export function AdminPlantillasProyectoPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<PlantillaProyectoAdminResponse | null>(null);
  const { data, isPending, isError, error } = usePlantillasProyectoAdmin({ q, page });
  const eliminar = useEliminarPlantillaProyectoAdmin();

  const encabezado = (
    <EncabezadoPagina
      titulo="Plantillas de proyecto del sistema"
      acciones={
        <Button onClick={() => setCreando(true)}>
          <PlusIcon data-icon="inline-start" /> Nueva plantilla
        </Button>
      }
    />
  );

  if (isPending)
    return (
      <>
        {encabezado}
        <Skeleton className="h-64" />
      </>
    );

  if (isError)
    return (
      <>
        {encabezado}
        <EstadoVacio
          titulo="No se pudo cargar la lista de plantillas"
          descripcion={mensajeDe(error, "Intenta de nuevo.")}
        />
      </>
    );

  return (
    <>
      {encabezado}

      <div className="max-w-sm">
        <Label htmlFor="buscar-plantillas-proyecto" className="sr-only">
          Buscar plantillas
        </Label>
        <Input
          id="buscar-plantillas-proyecto"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <TarjetaTabla
        pie={
          data.totalPaginas > 1 || page > 0 ? (
            <div className="flex gap-2">
              <Button
                aria-label="Página anterior"
                variant="outline"
                size="icon-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                aria-label="Página siguiente"
                variant="outline"
                size="icon-sm"
                disabled={page >= data.totalPaginas - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          ) : undefined
        }
      >
        {data.contenido.length === 0 ? (
          <EstadoVacio
            titulo="Sin plantillas"
            descripcion="Ninguna plantilla de proyecto del sistema coincide con la búsqueda."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.contenido.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>{p.descripcion ?? "—"}</TableCell>
                  <TableCell>{new Date(p.fechaCreacion).toLocaleDateString("es-EC")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => setEditando(p)}
                    >
                      <PencilIcon />
                    </Button>
                    <ConfirmarDestructivo
                      titulo="Eliminar plantilla"
                      descripcion={`¿Eliminar "${p.nombre}"? Los proyectos ya creados desde ella no cambian.`}
                      textoConfirmar="Eliminar"
                      onConfirmar={() => {
                        eliminar.mutate(p.id, { onSuccess: () => setPage(0) });
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Eliminar"
                        className="text-destructive"
                      >
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

      {creando && <DialogoCrear onClose={() => setCreando(false)} />}
      {editando && <DialogoEditar plantilla={editando} onClose={() => setEditando(null)} />}
    </>
  );
}
