import { useState } from "react";
import { toast } from "sonner";
import { useBasesCentrales } from "../hooks/useBasesCentrales";
import { useBasesPersonales } from "../hooks/useBasesPersonales";
import { useCopiarBase } from "../hooks/useInsumoMutaciones";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { CopiaBaseResultadoResponse, CopiarBaseRequest } from "@/api/contract";

// El valor del select lleva la fuente delante: una base central y una personal
// son filas distintas del backend y el POST necesita saber cuál es cuál.
const separarFuente = (valor: string) => {
  const [fuenteTipo, baseId] = valor.split(":") as [CopiarBaseRequest["fuenteTipo"], string];
  return { fuenteTipo, baseId };
};

export function DialogoCopiarBase({
  abierto,
  onClose,
  proyectoId,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: string;
}) {
  const { data: bases } = useBasesCentrales();
  const { data: personales } = useBasesPersonales();
  const [baseId, setBaseId] = useState<string>("");
  const [resultado, setResultado] = useState<CopiaBaseResultadoResponse | null>(null);
  const copiar = useCopiarBase(proyectoId);

  const handleCopy = () => {
    copiar.mutate(separarFuente(baseId), {
      onSuccess: setResultado,
      onError: () => toast.error("Error al copiar la base"),
    });
  };

  const handleClose = () => {
    setBaseId("");
    setResultado(null);
    onClose();
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copiar base de insumos</DialogTitle>
          <DialogDescription>
            Copia insumos desde una base del sistema o una base personal al proyecto actual.
          </DialogDescription>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="cb-base">Base de origen</Label>
              <Select value={baseId} onValueChange={setBaseId}>
                <SelectTrigger id="cb-base">
                  <SelectValue placeholder="Selecciona una base" />
                </SelectTrigger>
                <SelectContent>
                  {!!bases?.length && (
                    <SelectGroup>
                      <SelectLabel>Sistema</SelectLabel>
                      {bases.map((b) => (
                        <SelectItem key={b.id} value={`CENTRAL:${b.id}`}>
                          {b.nombre} ({b.totalInsumos} insumos)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {!!personales?.length && (
                    <SelectGroup>
                      <SelectLabel>Personales</SelectLabel>
                      {personales.map((b) => (
                        <SelectItem key={b.id} value={`PERSONAL:${b.id}`}>
                          {b.nombre} ({b.totalInsumos} insumos)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter>
              <Button onClick={handleCopy} disabled={!baseId || copiar.isPending}>
                {copiar.isPending ? (
                  <>
                    <Spinner /> Copiando…
                  </>
                ) : (
                  "Copiar"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              Se copiaron <strong>{resultado.copiados}</strong> insumos.
            </p>
            {resultado.omitidos.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Omitidos:</p>
                {resultado.omitidos.map((cod) => (
                  <p key={cod} className="text-sm text-muted-foreground">
                    {cod} — ya existe con el mismo código
                  </p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
