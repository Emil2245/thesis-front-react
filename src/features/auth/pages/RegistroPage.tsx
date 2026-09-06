import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { registroSchema } from "../schemas";
import { useRegistro } from "../hooks/useAuthMutaciones";
import { useState } from "react";
import { ApiError } from "@/api/problem";

export function RegistroPage() {
  const form = useForm({
    resolver: zodResolver(registroSchema),
    defaultValues: { nombre: "", email: "", password: "", passwordConfirmacion: "" },
  });
  const registro = useRegistro();
  const [errorGeneral, setErrorGeneral] = useState("");

  async function onSubmit(data: {
    nombre: string;
    email: string;
    password: string;
    passwordConfirmacion: string;
  }) {
    setErrorGeneral("");
    try {
      await registro.mutateAsync({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        passwordConfirmacion: data.passwordConfirmacion,
      });
    } catch (e) {
      // El backend no dice *qué* campo falló: `ErrorPayload` son dos strings y
      // el mapper se queda con el primer mensaje de la violación. Marcar el
      // campo concreto es imposible con este contrato, así que el mensaje del
      // servidor —"El correo ya está registrado", "Las contraseñas no
      // coinciden"— se muestra como error general del formulario.
      if (e instanceof ApiError) {
        setErrorGeneral(e.problem.mensaje || "Error al crear la cuenta");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {errorGeneral ? <p className="text-sm text-peligro">{errorGeneral}</p> : null}

            <Field>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register("nombre")} />
              {form.formState.errors.nombre && (
                <p className="text-sm text-peligro">{form.formState.errors.nombre.message}</p>
              )}
            </Field>

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

            <Button type="submit" className="w-full" disabled={registro.isPending}>
              {registro.isPending ? "Creando…" : "Crear cuenta"}
            </Button>

            <p className="text-center text-sm">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary underline">
                Ingresar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
