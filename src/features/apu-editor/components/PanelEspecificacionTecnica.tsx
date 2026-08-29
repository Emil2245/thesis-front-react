import { useState } from "react";
import { ChevronDownIcon, SaveIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LIMITE_BYTES = 64 * 1024;

interface PanelEspecificacionTecnicaProps {
  texto: string | null | undefined;
  onGuardar: (texto: string) => Promise<void>;
}

export function PanelEspecificacionTecnica({ texto, onGuardar }: PanelEspecificacionTecnicaProps) {
  const [abierto, setAbierto] = useState(() => !!texto);
  const [valor, setValor] = useState(texto ?? "");
  const [guardando, setGuardando] = useState(false);

  const bytes = new TextEncoder().encode(valor).length;
  const excedeLimite = bytes > LIMITE_BYTES;

  const guardar = async () => {
    setGuardando(true);
    try {
      await onGuardar(valor);
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
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={6}
            placeholder="Especificación técnica del APU..."
          />
          <div className="flex items-center justify-between">
            <span
              className={cn("text-xs text-muted-foreground", excedeLimite && "text-destructive")}
            >
              {bytes.toLocaleString("es-EC")} / {LIMITE_BYTES.toLocaleString("es-EC")} bytes
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
