import { cn } from "@/lib/utils";

const VARIANTES: Record<string, string> = {
  conforme: "bg-exito/15 text-exito-foreground border-exito/30",
  "no-conforme": "bg-peligro/15 text-peligro-foreground border-peligro/30",
  borrador: "bg-muted text-muted-foreground border-border",
  "en-proceso": "bg-advertencia/15 text-advertencia-foreground border-advertencia/30",
  finalizado: "bg-exito/15 text-exito-foreground border-exito/30",
  vigente: "bg-primary/15 text-primary border-primary/30",
  auxiliar: "bg-secondary text-secondary-foreground border-border",
  desactualizado: "bg-advertencia/15 text-advertencia-foreground border-advertencia/30",
};

export function ChipEstado({ estado, className }: { estado: string; className?: string }) {
  const v = VARIANTES[estado] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        v,
        className,
      )}
    >
      {estado}
    </span>
  );
}
