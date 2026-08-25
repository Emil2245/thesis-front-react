import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminUsuarios,
  useInvitarUsuario,
  useEliminarUsuario,
  useRestaurarUsuario,
} from "../hooks/useAdminUsuarios";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";
import { PlusIcon, Trash2Icon, RotateCcwIcon } from "lucide-react";

// El backend no tiene /admin/usuarios todavía (plan 027). Para reactivar:
// borra este bloque, quita "admin" de MODULOS_SIN_BACKEND (si ya no aplica al
// resto del grupo) y exporta AdminUsuariosPageActiva como AdminUsuariosPage.
export function AdminUsuariosPage() {
  return (
    <>
      <EncabezadoPagina titulo="Usuarios" />
      <ModuloNoDisponible
        modulo="La administración de usuarios"
        descripcion="El servidor todavía no expone la administración de usuarios. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}

export function AdminUsuariosPageActiva() {
  const { data, isPending } = useAdminUsuarios();
  const invitar = useInvitarUsuario();
  const eliminar = useEliminarUsuario();
  const restaurar = useRestaurarUsuario();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"USUARIO" | "SUPER_ADMIN">("USUARIO");

  if (isPending) return <CargandoTabla />;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <Button onClick={() => setDialogAbierto(true)}>
          <PlusIcon /> Invitar
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Verificado</TableHead>
            <TableHead className="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.contenido.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.nombre}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.rol === "SUPER_ADMIN" ? "default" : "outline"}>{u.rol}</Badge>
              </TableCell>
              <TableCell>
                {u.activo ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
              </TableCell>
              <TableCell>
                {u.emailVerificado ? (
                  <Badge variant="outline">Sí</Badge>
                ) : (
                  <Badge variant="secondary">No</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {u.activo ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => eliminar.mutate(u.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => restaurar.mutate(u.id)}>
                    <RotateCcwIcon className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inv-nombre">Nombre</Label>
              <Input id="inv-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email</Label>
              <Input
                id="inv-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={rol} onValueChange={(v: "USUARIO" | "SUPER_ADMIN") => setRol(v)}>
                <SelectTrigger aria-label="Rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuario</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAbierto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                invitar.mutate({ nombre, email, rol });
                setDialogAbierto(false);
              }}
              disabled={!nombre || !email}
            >
              Invitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
