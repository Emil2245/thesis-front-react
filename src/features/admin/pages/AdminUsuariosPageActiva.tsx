import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
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
import { ApiError } from "@/api/problem";
import type { Rol, UsuarioAdminResponse } from "@/api/contract";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  Trash2Icon,
} from "lucide-react";
import {
  useUsuariosAdmin,
  useInvitarUsuario,
  useEditarUsuario,
  useDesactivarUsuario,
  useReactivarUsuario,
  useEliminarUsuario,
} from "../hooks/useUsuariosAdmin";

const ETIQUETA_ROL: Record<Rol, string> = { USUARIO: "Usuario", SUPER_ADMIN: "Super admin" };

/** Alta: pide nombre, email y rol; los tres son `@NotNull` en el backend. */
function DialogoInvitar({
  abierto,
  onClose,
  onInvitar,
}: {
  abierto: boolean;
  onClose: () => void;
  onInvitar: (datos: { nombre: string; email: string; rol: Rol }) => Promise<unknown>;
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("USUARIO");
  const [errorGeneral, setErrorGeneral] = useState("");

  async function enviar() {
    setErrorGeneral("");
    try {
      await onInvitar({ nombre: nombre.trim(), email: email.trim(), rol });
      onClose();
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.problem.mensaje : "Error al invitar usuario");
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
        </DialogHeader>
        {errorGeneral ? <p className="text-sm text-destructive">{errorGeneral}</p> : null}
        <div className="space-y-4">
          <Field>
            <Label htmlFor="invitar-nombre">Nombre</Label>
            <Input id="invitar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="invitar-email">Correo electrónico</Label>
            <Input
              id="invitar-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="invitar-rol">Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="invitar-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USUARIO">Usuario</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={nombre.trim() === "" || email.trim() === ""} onClick={enviar}>
            Invitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edición: nombre y rol. `activo` viaja en el PUT porque el backend lo exige
 * (`@NotNull`), pero no se muestra aquí — desactivar/reactivar tienen su
 * propio botón — así que se manda el valor actual del usuario sin tocar.
 * Nunca manda `email`: no es editable por este endpoint.
 */
function DialogoEditar({
  usuario,
  onClose,
  onGuardar,
}: {
  usuario: UsuarioAdminResponse;
  onClose: () => void;
  onGuardar: (datos: { nombre: string; rol: Rol; activo: boolean }) => Promise<unknown>;
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<Rol>(usuario.rol);
  const [errorGeneral, setErrorGeneral] = useState("");

  async function enviar() {
    setErrorGeneral("");
    try {
      await onGuardar({ nombre: nombre.trim(), rol, activo: usuario.activo });
      onClose();
    } catch (e) {
      setErrorGeneral(e instanceof ApiError ? e.problem.mensaje : "Error al actualizar usuario");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>
        {errorGeneral ? <p className="text-sm text-destructive">{errorGeneral}</p> : null}
        <div className="space-y-4">
          <Field>
            <Label htmlFor="editar-nombre">Nombre</Label>
            <Input id="editar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="editar-rol">Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
              <SelectTrigger id="editar-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USUARIO">Usuario</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admin</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button disabled={nombre.trim() === ""} onClick={enviar}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUsuariosPageActiva() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [invitando, setInvitando] = useState(false);
  const [editando, setEditando] = useState<UsuarioAdminResponse | null>(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  const { data: usuarios, isPending, isError, error } = useUsuariosAdmin({ q, page, size: 25 });
  const invitar = useInvitarUsuario();
  const editar = useEditarUsuario();
  const desactivar = useDesactivarUsuario();
  const reactivar = useReactivarUsuario();
  const eliminar = useEliminarUsuario();

  if (isPending)
    return (
      <>
        <EncabezadoPagina titulo="Usuarios" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  if (isError)
    return (
      <>
        <EncabezadoPagina titulo="Usuarios" />
        <EstadoVacio
          titulo="No se pudo cargar la lista de usuarios"
          descripcion={error instanceof ApiError ? error.problem.mensaje : "Intenta de nuevo."}
        />
      </>
    );

  // El 409 `usuario-con-proyectos-impedido` (y cualquier otro fallo del
  // borrado) se muestra aquí, no sólo en el toast: `mutate` + `onError` en el
  // hook basta para el toast, pero un test —y un usuario que no vio el
  // toast— necesita algo que siga en pantalla.
  async function manejarEliminar(id: string) {
    setErrorEliminar("");
    try {
      await eliminar.mutateAsync(id);
      setPage(0);
    } catch (e) {
      setErrorEliminar(e instanceof ApiError ? e.problem.mensaje : "Error al eliminar usuario");
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios"
        acciones={
          <Button onClick={() => setInvitando(true)}>
            <PlusIcon data-icon="inline-start" /> Invitar usuario
          </Button>
        }
      />

      {errorEliminar ? <p className="text-sm text-destructive">{errorEliminar}</p> : null}

      <div className="max-w-sm">
        <Label htmlFor="buscar-usuarios" className="sr-only">
          Buscar usuarios
        </Label>
        <Input
          id="buscar-usuarios"
          placeholder="Buscar por nombre o correo…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <TarjetaTabla
        pie={
          usuarios.totalPaginas > 1 || page > 0 ? (
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
                    disabled={page >= usuarios.totalPaginas - 1}
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
        {usuarios.contenido.length === 0 ? (
          <EstadoVacio
            titulo="Sin usuarios"
            descripcion="Ningún usuario coincide con la búsqueda."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-36 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.contenido.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{ETIQUETA_ROL[u.rol]}</TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "secondary" : "outline"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => setEditando(u)}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={u.activo ? "Desactivar" : "Reactivar"}
                      onClick={() => (u.activo ? desactivar.mutate(u.id) : reactivar.mutate(u.id))}
                    >
                      <PowerIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Eliminar"
                      className="text-destructive"
                      onClick={() => manejarEliminar(u.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TarjetaTabla>

      {invitando && (
        <DialogoInvitar
          abierto
          onClose={() => setInvitando(false)}
          onInvitar={(datos) => invitar.mutateAsync(datos)}
        />
      )}
      {editando && (
        <DialogoEditar
          usuario={editando}
          onClose={() => setEditando(null)}
          onGuardar={(datos) => editar.mutateAsync({ id: editando.id, ...datos })}
        />
      )}
    </>
  );
}
