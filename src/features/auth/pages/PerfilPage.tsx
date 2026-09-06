import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { useSesionStore } from "../sesion";
import { perfilSchema, cambiarPasswordSchema } from "../schemas";
import { useActualizarPerfil, useCambiarPassword } from "../hooks/useAuthMutaciones";

export function PerfilPage() {
  const usuario = useSesionStore((s) => s.usuario);
  const cerrar = useSesionStore((s) => s.cerrar);

  const perfilForm = useForm({
    resolver: zodResolver(perfilSchema),
    values: { nombre: usuario?.nombre ?? "", email: usuario?.email ?? "" },
  });
  const actualizarPerfil = useActualizarPerfil();

  const passwordForm = useForm({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: { passwordActual: "", passwordNueva: "", passwordConfirmacion: "" },
  });
  const cambiarPassword = useCambiarPassword();

  if (!usuario) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Mi perfil
            <Badge variant="outline">{usuario.rol === "SUPER_ADMIN" ? "Admin" : "Usuario"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={perfilForm.handleSubmit((data) => actualizarPerfil.mutateAsync(data))}
            className="space-y-4"
          >
            <Field>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...perfilForm.register("nombre")} />
              {perfilForm.formState.errors.nombre && (
                <p className="text-sm text-peligro">{perfilForm.formState.errors.nombre.message}</p>
              )}
            </Field>

            <Field>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" {...perfilForm.register("email")} />
              {perfilForm.formState.errors.email && (
                <p className="text-sm text-peligro">{perfilForm.formState.errors.email.message}</p>
              )}
            </Field>

            <p className="text-sm text-muted-foreground">
              Cambiar tu correo requiere verificar la nueva dirección. Tu cuenta seguirá funcionando
              con el correo actual hasta que la verifiques.
            </p>

            <Button type="submit" disabled={actualizarPerfil.isPending}>
              {actualizarPerfil.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(async (data) => {
              await cambiarPassword.mutateAsync({
                passwordActual: data.passwordActual,
                passwordNueva: data.passwordNueva,
                passwordConfirmacion: data.passwordConfirmacion,
              });
              passwordForm.reset();
              cerrar();
            })}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Al cambiar tu contraseña, las demás sesiones se cerrarán.
            </p>

            <Field>
              <Label htmlFor="passwordActual">Contraseña actual</Label>
              <Input
                id="passwordActual"
                type="password"
                {...passwordForm.register("passwordActual")}
              />
              {passwordForm.formState.errors.passwordActual && (
                <p className="text-sm text-peligro">
                  {passwordForm.formState.errors.passwordActual.message}
                </p>
              )}
            </Field>

            <Field>
              <Label htmlFor="passwordNueva">Nueva contraseña</Label>
              <Input
                id="passwordNueva"
                type="password"
                {...passwordForm.register("passwordNueva")}
              />
              {passwordForm.formState.errors.passwordNueva && (
                <p className="text-sm text-peligro">
                  {passwordForm.formState.errors.passwordNueva.message}
                </p>
              )}
            </Field>

            <Field>
              <Label htmlFor="passwordConfirmacion">Confirmar contraseña</Label>
              <Input
                id="passwordConfirmacion"
                type="password"
                {...passwordForm.register("passwordConfirmacion")}
              />
              {passwordForm.formState.errors.passwordConfirmacion && (
                <p className="text-sm text-peligro">
                  {passwordForm.formState.errors.passwordConfirmacion.message}
                </p>
              )}
            </Field>

            <Button type="submit" disabled={cambiarPassword.isPending}>
              {cambiarPassword.isPending ? "Cambiando…" : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
