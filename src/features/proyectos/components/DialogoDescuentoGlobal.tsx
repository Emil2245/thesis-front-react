import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { crearDescuentoSchema, type DescuentoFormData } from "../schemas";
import { usePreviewDescuento, useAplicarDescuento } from "../hooks/useDescuentoGlobal";
import { useParametrosSistema } from "@/features/admin/hooks/useParametrosSistema";
import type { DescuentoGlobalPreviewResponse } from "@/api/contract";
import { fraccionAPorcentaje, porcentajeAFraccionDecimal } from "@/lib/decimal";
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
import { ModuloNoDisponible } from "@/components/comunes/ModuloNoDisponible";

interface DialogoDescuentoGlobalProps {
  abierto: boolean;
  onClose: () => void;
  presupuestoId: string | null;
}

// El backend no tiene /descuento-global (plan 054): la especificación se cerró
// el 2026-08-31 pero no hay implementación en origin/main, así que el diálogo
// activo daría 404. Para reactivar: borra este bloque, quita "descuento-global"
// de MODULOS_SIN_BACKEND y exporta DialogoDescuentoGlobalActivo como
// DialogoDescuentoGlobal.
export function DialogoDescuentoGlobal({ abierto, onClose }: DialogoDescuentoGlobalProps) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Descuento global</DialogTitle>
        </DialogHeader>
        <ModuloNoDisponible
          modulo="El descuento global"
          descripcion="El servidor todavía no expone el descuento global de la versión vigente. La pantalla está construida y se activará cuando el endpoint exista."
        />
      </DialogContent>
    </Dialog>
  );
}

export function DialogoDescuentoGlobalActivo({
  abierto,
  onClose,
  presupuestoId,
}: DialogoDescuentoGlobalProps) {
  const { data: sistema } = useParametrosSistema();
  const maxDesc = sistema?.rangoDescuentoMax ? fraccionAPorcentaje(sistema.rangoDescuentoMax) : 50;
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
      porcentaje: porcentajeAFraccionDecimal(porcentaje),
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
            Reduce las columnas de precio de tu base de proyecto (tarifa en EQUIPO y TRANSPORTE,
            precio unitario en MATERIAL) en todos los APUs de la versión vigente. MANO DE OBRA queda
            exenta por ley, y la Herramienta Menor no se descuenta porque se deriva de ella.
            Reversible poniendo 0 %.
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
                    <TableHead className="text-right">CD antes</TableHead>
                    <TableHead className="text-right">CD</TableHead>
                    <TableHead className="text-right">CI</TableHead>
                    <TableHead className="text-right">CT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.porApu.map((apu) => (
                    <TableRow key={apu.apuId}>
                      <TableCell className="font-mono text-xs">{apu.codigo}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.cdAntes}</TableCell>
                      <TableCell className="text-right tabular-nums">{apu.cd}</TableCell>
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
