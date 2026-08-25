import { cn } from "@/lib/utils";

const VARIANTES: Record<string, string> = {
  conforme: "bg-exito/15 text-exito-texto border-exito/30",
  "no-conforme": "bg-peligro/15 text-peligro-texto border-peligro/30",
  borrador: "bg-muted text-muted-foreground border-border",
  "en-proceso": "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
  finalizado: "bg-exito/15 text-exito-texto border-exito/30",
  vigente: "bg-primary/15 text-primary border-primary/30",
  auxiliar: "bg-secondary text-secondary-foreground border-border",
  desactualizado: "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
};

const ETIQUETAS: Record<string, string> = {
  conforme: "Conforme",
  "no-conforme": "No conforme",
  borrador: "Borrador",
  "en-proceso": "En proceso",
  finalizado: "Finalizado",
  vigente: "Vigente",
  auxiliar: "Auxiliar",
  desactualizado: "Desactualizado",
};

/** El backend envía `EN_PROCESO`; las variantes se indexan como `en-proceso`. */
function normalizar(estado: string) {
  return estado.trim().toLowerCase().replace(/_/g, "-");
}

function etiquetar(clave: string) {
  const texto = clave.replace(/-/g, " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function ChipEstado({ estado, className }: { estado: string; className?: string }) {
  const clave = normalizar(estado);
  const v = VARIANTES[clave] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        v,
        className,
      )}
    >
      {ETIQUETAS[clave] ?? etiquetar(clave)}
    </span>
  );
}
