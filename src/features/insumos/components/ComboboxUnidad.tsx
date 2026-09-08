import { TriangleAlertIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

const UNIDADES_CONOCIDAS = [
  "h",
  "kg",
  "m3",
  "m2",
  "m",
  "l",
  "un",
  "viaje",
  "gl",
  "sac",
  "rollo",
  "pieza",
  "par",
  "jornal",
];

export function ComboboxUnidad({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const esConocida = UNIDADES_CONOCIDAS.includes(value);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {UNIDADES_CONOCIDAS.slice(0, 8).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            data-active={value === u}
            className="rounded border border-input px-2 py-0.5 text-xs transition-colors hover:bg-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
          >
            {u}
          </button>
        ))}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O escribe una unidad personalizada…"
      />
      {value !== "" && !esConocida && (
        <p className="flex items-center gap-1 text-xs text-advertencia-texto">
          <TriangleAlertIcon className="size-3" />
          Unidad no común. Verifica que sea correcta.
        </p>
      )}
    </div>
  );
}
