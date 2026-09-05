import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { crearDescuentoSchema, type DescuentoFormData } from "../schemas";
import { usePreviewDescuento, useAplicarDescuento } from "../hooks/useDescuentoGlobal";
import { useParametrosSistema } from "@/features/admin/hooks/useParametrosSistema";
import type { DescuentoGlobalPreviewResponse } from "@/api/contract";
import { asDecimal } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DialogoDescuentoGlobal({
  abierto,
  onClose,
  presupuestoId,
}: {
  abierto: boolean;
  onClose: () => void;
  presupuestoId: number | null;
}) {
  const { data: sistema } = useParametrosSistema();
  const maxDesc = sistema?.rangoDescuentoMax ? Number(sistema.rangoDescuentoMax) * 100 : 50;
  const schema = useMemo(() => crearDescuentoSchema(maxDesc), [maxDesc]);

  const form = useForm<DescuentoFormData>({
    resolver: zodResolver(schema),
    defaultValues: { porcentaje: 0 },
  });

  const preview = usePreviewDescuento(presupuestoId);
  const aplicar = useAplicarDescuento();
  const [previewData, setPreviewData] = useState<DescuentoGlobalPreviewResponse | null>(null);

  const porcentaje = form.watch("porcentaje");

  useEffect(() => {
    if (porcentaje > 0 && porcentaje <= maxDesc) {
      const timer = setTimeout(async () => {
        try {
          const data = await preview.mutateAsync(porcentaje);
          setPreviewData(data);
        } catch {
          setPreviewData(null);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPreviewData(null);
    }
  }, [porcentaje, preview, maxDesc]);

  const handleAplicar = async () => {
    if (presupuestoId == null) return;
    await aplicar.mutateAsync({
      presupuestoId,
      porcentaje: asDecimal((porcentaje / 100).toFixed(6)),
    });
    toast.success("Descuento aplicado");
    onClose();
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Descuento global</DialogTitle>
          <DialogDescription>
            Aplica un porcentaje de descuento a todos los APUs de la versión vigente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <Label htmlFor="dcto-porcentaje">{`Porcentaje (0–${maxDesc} %)`}</Label>
            <Input
              id="dcto-porcentaje"
              type="number"
              step="0.01"
              {...form.register("porcentaje", { valueAsNumber: true })}
            />
            <FieldError>{form.formState.errors.porcentaje?.message}</FieldError>
          </Field>

          {previewData && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">CD</TableHead>
                    <TableHead className="text-right">CD ajustado</TableHead>
                    <TableHead className="text-right">CI</TableHead>
                    <TableHead className="text-right">CT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.porApu.map((apu) => (
                    <TableRow key={apu.apuId}>
                      <TableCell className="font-mono text-xs">{apu.codigo}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.cd}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.cdAjustado}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.ci}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.ct}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-4 text-sm">
                <span>
                  Actual: <strong>{previewData.totalGeneralActual}</strong>
                </span>
                <span>
                  Nuevo: <strong>{previewData.totalGeneralProyectado}</strong>
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleAplicar} disabled={aplicar.isPending || previewData == null}>
            {aplicar.isPending ? "Aplicando…" : "Aplicar descuento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
