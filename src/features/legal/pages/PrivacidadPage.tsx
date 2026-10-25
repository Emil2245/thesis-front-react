import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACTO_PRIVACIDAD } from "@/lib/env";
import { POLITICA_SECCIONES } from "../politicaPrivacidad";

export function PrivacidadPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Política de privacidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {POLITICA_SECCIONES.map((s) => (
            <section key={s.titulo} className="space-y-1">
              <h2 className="font-semibold">{s.titulo}</h2>
              {s.parrafos.map((p) => (
                <p key={p}>{p.replace("{contacto}", CONTACTO_PRIVACIDAD)}</p>
              ))}
            </section>
          ))}
          <Link to="/login" className="block text-primary underline">
            Volver
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
