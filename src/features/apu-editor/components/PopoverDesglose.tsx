import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ApuCalculoResponse } from "@/api/contract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PopoverDesgloseProps {
  abierto: boolean;
  onClose: () => void;
  apuId: string;
}

export function PopoverDesglose({ abierto, onClose, apuId }: PopoverDesgloseProps) {
  const { data, isPending } = useQuery({
    queryKey: qk.apuCalculo(apuId),
    queryFn: () => get<ApuCalculoResponse>(`/apus/${apuId}/calculo`),
    enabled: abierto,
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desglose de cálculo</DialogTitle>
          <DialogDescription>
            Detalle del cálculo del costo directo, indirecto y total.
          </DialogDescription>
        </DialogHeader>

        {isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}

        {data && (
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              {data.formulas.map((f, i) => (
                <div key={i} className="flex justify-between gap-4 rounded bg-muted p-2">
                  <span className="text-muted-foreground">{f.concepto}</span>
                  <span className="font-mono text-xs">{f.formula}</span>
                  <span className="num font-medium">{f.resultado}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                Subtotales por bloque
              </p>
              {Object.entries(data.subtotales).map(([bloque, valor]) => (
                <div key={bloque} className="flex justify-between text-xs">
                  <span>Bloque {bloque}</span>
                  <span className="num">{valor}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span>CD</span>
                <span className="num font-medium">{data.cd}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>CI</span>
                <span className="num font-medium">{data.ci}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span>CT</span>
                <span className="num">{data.ct}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
