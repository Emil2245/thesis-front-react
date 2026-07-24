import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/problem";
import { useVerificarEmail, useReenviarVerificacion } from "../hooks/useAuthMutaciones";

type Estado = "revisar" | "verificando" | "exito" | "expirado";

export function VerificarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "revisar");
  const [cooldown, setCooldown] = useState(0);

  const verificar = useVerificarEmail();
  const reenviar = useReenviarVerificacion();

  useEffect(() => {
    if (token && estado === "verificando") {
      verificar.mutate(token, {
        onSuccess: () => setEstado("exito"),
        onError: (e) => {
          if (e instanceof ApiError && e.is("token-invalido-o-expirado")) {
            setEstado("expirado");
          }
        },
      });
    }
  }, [token, estado, verificar]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  async function handleReenviar() {
    if (!email || cooldown > 0) return;
    try {
      await reenviar.mutateAsync(email);
      setCooldown(60);
    } catch {
      // cooldown-activo handled by disabled state
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Verificar correo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {estado === "revisar" && (
            <>
              <p>
                Te hemos enviado un enlace de verificación a <strong>{email}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">Revisa tu bandeja de entrada.</p>
              <Button
                variant="outline"
                onClick={handleReenviar}
                disabled={cooldown > 0 || reenviar.isPending}
              >
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar verificación"}
              </Button>
            </>
          )}

          {estado === "verificando" && <p>Verificando tu correo…</p>}

          {estado === "exito" && (
            <>
              <p className="text-exito">¡Correo verificado exitosamente!</p>
              <Link to="/login" className="text-primary underline">
                Ir a iniciar sesión
              </Link>
            </>
          )}

          {estado === "expirado" && (
            <>
              <p className="text-peligro">El enlace ha expirado.</p>
              {email && (
                <Button variant="outline" onClick={handleReenviar} disabled={cooldown > 0}>
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar verificación"}
                </Button>
              )}
              <Link to="/login" className="block text-primary underline">
                Volver a inicio
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
