import { useEffect, useState } from "react";
import { ChevronDownIcon, SaveIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatearNumero } from "@/lib/decimal";

const LIMITE_BYTES = 64 * 1024;

interface PanelEspecificacionTecnicaProps {
  texto: string | null | undefined;
  onBorradorChange?: (borrador: boolean) => void;
  onGuardar: (texto: string) => Promise<void>;
}

export function PanelEspecificacionTecnica({
  texto,
  onGuardar,
  onBorradorChange,
}: PanelEspecificacionTecnicaProps) {
  const [abierto, setAbierto] = useState(() => !!texto);
  const [borrador, setBorrador] = useState<string | undefined>();
  const valor = borrador ?? texto ?? "";
  const [error, setError] = useState(false);
  useEffect(() => {
    onBorradorChange?.(borrador !== undefined && borrador !== (texto ?? ""));
  }, [onBorradorChange, borrador, texto]);
  const [guardando, setGuardando] = useState(false);

  const bytes = new TextEncoder().encode(valor).length;
  const excedeLimite = bytes > LIMITE_BYTES;

  const guardar = async () => {
    setGuardando(true);
    try {
      setError(false);
      await onGuardar(valor);
      setBorrador(undefined);
    } catch {
      setError(true);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setAbierto((a) => !a)}
          >
            Especificación técnica
            <ChevronDownIcon
              className={cn("size-4 transition-transform", abierto && "rotate-180")}
            />
          </button>
        </CardTitle>
      </CardHeader>
      {abierto && (
        <CardContent className="flex flex-col gap-2">
          <Textarea
            disabled={guardando}
            aria-label="Especificación técnica"
            value={valor}
            onChange={(e) => setBorrador(e.target.value)}
            rows={6}
            placeholder="Especificación técnica del APU..."
          />
          {error && <p role="alert">No se pudo guardar la especificación técnica</p>}
          <div className="flex items-center justify-between">
            <span
              className={cn("text-xs text-muted-foreground", excedeLimite && "text-destructive")}
            >
              {formatearNumero(bytes, { min: 0, max: 0 })} /{" "}
              {formatearNumero(LIMITE_BYTES, { min: 0, max: 0 })} bytes
            </span>
            <Button size="sm" onClick={guardar} disabled={excedeLimite || guardando}>
              <SaveIcon data-icon="inline-start" /> Guardar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
