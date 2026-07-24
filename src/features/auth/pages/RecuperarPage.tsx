import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { useRecuperarPassword } from "../hooks/useAuthMutaciones";

const recuperarSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export function RecuperarPage() {
  const form = useForm({
    resolver: zodResolver(recuperarSchema),
    defaultValues: { email: "" },
  });
  const recuperar = useRecuperarPassword();
  const [enviado, setEnviado] = useState(false);

  async function onSubmit(data: { email: string }) {
    await recuperar.mutateAsync(data.email);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center">Recuperar contraseña</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>
              Si el correo ingresado está registrado, recibirás un enlace para restablecer tu
              contraseña.
            </p>
            <Link to="/login" className="block text-primary underline">
              Volver a inicio
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
          <CardTitle className="text-center">Recuperar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-peligro">{form.formState.errors.email.message}</p>
              )}
            </Field>

            <Button type="submit" className="w-full" disabled={recuperar.isPending}>
              {recuperar.isPending ? "Enviando…" : "Enviar enlace"}
            </Button>

            <Link to="/login" className="block text-center text-sm text-primary underline">
              Volver a inicio
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
