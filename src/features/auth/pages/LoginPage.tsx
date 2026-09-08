import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { ApiError } from "@/api/problem";
import { loginSchema } from "../schemas";
import { useLogin } from "../hooks/useAuthMutaciones";

export function LoginPage() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", recordarSesion: false },
  });
  const login = useLogin();
  const [errorGeneral, setErrorGeneral] = useState("");
  const [emailNoVerificado, setEmailNoVerificado] = useState(false);
  const [cuentaDesactivada, setCuentaDesactivada] = useState(false);

  async function onSubmit(data: { email: string; password: string; recordarSesion: boolean }) {
    setErrorGeneral("");
    setEmailNoVerificado(false);
    setCuentaDesactivada(false);
    try {
      await login.mutateAsync(data);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.is("credenciales-invalidas")) {
          setErrorGeneral("Correo o contraseña incorrectos");
        } else if (e.is("email-no-verificado")) {
          setEmailNoVerificado(true);
        } else if (e.is("cuenta-desactivada")) {
          setCuentaDesactivada(true);
        }
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Sistema APU</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorGeneral ? <p className="text-sm text-peligro">{errorGeneral}</p> : null}
            {emailNoVerificado ? (
              <p className="text-sm text-advertencia">
                Tu correo no ha sido verificado.{" "}
                <Link
                  to={`/verificar-email?email=${encodeURIComponent(form.getValues("email"))}`}
                  className="underline"
                >
                  Reenviar verificación
                </Link>
              </p>
            ) : null}
            {cuentaDesactivada ? (
              <p className="text-sm text-peligro">
                Tu cuenta ha sido desactivada. Contacta al administrador.
              </p>
            ) : null}

            <Field>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-peligro">{form.formState.errors.email.message}</p>
              )}
            </Field>

            <Field>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && (
                <p className="text-sm text-peligro">{form.formState.errors.password.message}</p>
              )}
            </Field>

            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="recordarSesion"
                render={({ field }) => (
                  <Checkbox
                    id="recordar"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <Label htmlFor="recordar">Recordar sesión</Label>
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Ingresando…" : "Ingresar"}
            </Button>

            <div className="flex justify-between text-sm">
              <Link to="/recuperar" className="text-primary underline">
                Olvidé mi contraseña
              </Link>
              <Link to="/registro" className="text-primary underline">
                Crear cuenta
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
