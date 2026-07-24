import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/api/problem";
import { restablecerSchema } from "../schemas";
import { useRestablecerPassword } from "../hooks/useAuthMutaciones";

export function RestablecerPage() {
  const { token } = useParams<{ token: string }>();
  const form = useForm({
    resolver: zodResolver(restablecerSchema),
    defaultValues: { password: "", passwordConfirmacion: "" },
  });
  const restablecer = useRestablecerPassword();
  const [exito, setExito] = useState(false);
  const [expirado, setExpirado] = useState(false);

  async function onSubmit(data: { password: string; passwordConfirmacion: string }) {
    if (!token) return;
    try {
      await restablecer.mutateAsync({ token, password: data.password });
      setExito(true);
    } catch (e) {
      if (e instanceof ApiError && e.is("token-invalido-o-expirado")) {
        setExpirado(true);
      }
    }
  }

  if (expirado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center space-y-4 pt-6">
            <p className="text-peligro">El enlace ha expirado.</p>
            <Link to="/recuperar" className="block text-primary underline">
              Solicitar nuevo enlace
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center space-y-4 pt-6">
            <p className="text-exito">Contraseña restablecida exitosamente.</p>
            <Link to="/login" className="block text-primary underline">
              Iniciar sesión
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Restablecer contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-peligro">{form.formState.errors.password.message}</p>
              )}
            </Field>

            <Field>
              <Label htmlFor="passwordConfirmacion">Confirmar contraseña</Label>
              <Input
                id="passwordConfirmacion"
                type="password"
                {...form.register("passwordConfirmacion")}
              />
              {form.formState.errors.passwordConfirmacion && (
                <p className="text-sm text-peligro">
                  {form.formState.errors.passwordConfirmacion.message}
                </p>
              )}
            </Field>

            <Button type="submit" className="w-full" disabled={restablecer.isPending}>
              {restablecer.isPending ? "Restableciendo…" : "Restablecer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
