import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { toast } from "sonner";
import { useBasesCentrales } from "../hooks/useBasesCentrales";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { CopiaBaseResultadoResponse } from "@/api/contract";

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
  const [baseId, setBaseId] = useState<string>("");
  const [resultado, setResultado] = useState<CopiaBaseResultadoResponse | null>(null);
  const qc = useQueryClient();

  const copiar = useMutation({
    mutationFn: () =>
      post<CopiaBaseResultadoResponse>(`/proyectos/${proyectoId}/insumos/copiar`, {
        fuenteTipo: "CENTRAL",
        baseId: Number(baseId),
      }),
    onSuccess: (data) => {
      setResultado(data);
      qc.invalidateQueries({ queryKey: qk.insumos(proyectoId) });
    },
    onError: () => {
      toast.error("Error al copiar la base");
    },
  });

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
            Copia insumos desde una base central al proyecto actual.
          </DialogDescription>
        </DialogHeader>

        {!resultado ? (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="cb-base">Base central</Label>
              <Select value={baseId} onValueChange={setBaseId}>
                <SelectTrigger id="cb-base">
                  <SelectValue placeholder="Selecciona una base" />
                </SelectTrigger>
                <SelectContent>
                  {bases?.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.nombre} ({b.totalInsumos} insumos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <DialogFooter>
              <Button onClick={() => copiar.mutate()} disabled={!baseId || copiar.isPending}>
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
