import { useVersionActiva, useProyectoActivoId } from "./contexto";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function SelectorVersion() {
  const proyectoId = useProyectoActivoId();
  const { versiones, activa, cambiar, isPending } = useVersionActiva();

  if (!proyectoId) return null;

  if (isPending) {
    return <Skeleton className="h-8 w-44" />;
  }

  if (versiones.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin versiones</span>;
  }

  return (
    <Select
      value={activa ? String(activa.id) : undefined}
      onValueChange={(value) => cambiar(Number(value))}
    >
      <SelectTrigger className="w-44" aria-label="Seleccionar versión">
        <SelectValue placeholder="Versión…" />
      </SelectTrigger>
      <SelectContent>
        {versiones.map((v) => (
          <SelectItem key={v.id} value={String(v.id)}>
            Versión {v.numero}
            {v.vigente ? " (vigente)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
