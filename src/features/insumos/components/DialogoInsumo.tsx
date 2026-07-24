import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { insumoSchema, type InsumoFormData } from "../schemas";
import { useCrearInsumo, useEditarInsumo } from "../hooks/useInsumoMutaciones";
import { ComboboxUnidad } from "./ComboboxUnidad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/api/problem";
import type { InsumoResponse } from "@/api/contract";
import { parsearEntradaDecimal, asDecimal } from "@/lib/decimal";

function precioLabel(tipo: string): string {
  if (tipo === "MANO_OBRA") return "Jornal/hr";
  if (tipo === "EQUIPO") return "Tarifa/hr";
  if (tipo === "TRANSPORTE") return "Tarifa";
  return "Precio unitario";
}

const TIPOS = [
  { value: "MATERIAL", label: "Material" },
  { value: "MANO_OBRA", label: "Mano de obra" },
  { value: "EQUIPO", label: "Equipo" },
  { value: "TRANSPORTE", label: "Transporte" },
] as const;

export function DialogoInsumo({
  abierto,
  onClose,
  proyectoId,
  insumo,
}: {
  abierto: boolean;
  onClose: () => void;
  proyectoId: number;
  insumo?: InsumoResponse;
}) {
  const esEditar = !!insumo;
  const crear = useCrearInsumo(proyectoId);
  const editar = useEditarInsumo(proyectoId);

  const form = useForm<InsumoFormData>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      codigo: "",
      descripcion: "",
      tipo: "MATERIAL",
      unidad: "",
      precioUnitario: "",
    },
  });

  const tipo = form.watch("tipo");

  useEffect(() => {
    if (insumo) {
      form.reset({
        codigo: insumo.codigo,
        descripcion: insumo.descripcion,
        tipo: insumo.tipo as InsumoFormData["tipo"],
        unidad: insumo.unidad,
        precioUnitario: insumo.precio,
      } as InsumoFormData);
    } else {
      form.reset({
        codigo: "",
        descripcion: "",
        tipo: "MATERIAL" as const,
        unidad: "",
        precioUnitario: "",
      });
    }
  }, [insumo, abierto, form]);

  useEffect(() => {
    if (tipo === "MANO_OBRA" || tipo === "EQUIPO") {
      form.setValue("unidad", "h");
    }
  }, [tipo, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const precio = parsearEntradaDecimal(data.precioUnitario);
    if (!precio) return;

    try {
      if (esEditar && insumo) {
        await editar.mutateAsync({
          id: insumo.id,
          body: {
            codigo: data.codigo,
            descripcion: data.descripcion,
            unidad: data.unidad,
            precio: asDecimal(precio),
          },
        });
        toast.success("Insumo actualizado");
      } else {
        await crear.mutateAsync({
          codigo: data.codigo,
          descripcion: data.descripcion,
          tipo: data.tipo,
          unidad: data.unidad,
          precio: asDecimal(precio),
        });
        toast.success("Insumo creado");
      }
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        for (const ce of err.camposConError) {
          form.setError(ce.campo as keyof InsumoFormData, {
            message: ce.mensaje,
          });
        }
      } else {
        toast.error("Error al guardar el insumo");
      }
    }
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{esEditar ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field>
            <Label htmlFor="di-codigo">Código</Label>
            <Input id="di-codigo" {...form.register("codigo")} disabled={esEditar} />
            <FieldError>{form.formState.errors.codigo?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="di-descripcion">Descripción</Label>
            <Input id="di-descripcion" {...form.register("descripcion")} />
            <FieldError>{form.formState.errors.descripcion?.message}</FieldError>
          </Field>

          <Field>
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(v) => form.setValue("tipo", v as InsumoFormData["tipo"])}
              disabled={esEditar}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <Label htmlFor="di-unidad">
              {tipo === "MANO_OBRA" || tipo === "EQUIPO" ? "Unidad" : "Unidad"}
            </Label>
            {tipo === "MANO_OBRA" || tipo === "EQUIPO" ? (
              <Input id="di-unidad" value="h" disabled />
            ) : (
              <ComboboxUnidad
                value={form.watch("unidad")}
                onChange={(v) => form.setValue("unidad", v)}
              />
            )}
            <FieldError>{form.formState.errors.unidad?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="di-precio">{precioLabel(tipo)}</Label>
            <Input
              id="di-precio"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("precioUnitario")}
            />
            <FieldError>{form.formState.errors.precioUnitario?.message}</FieldError>
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={crear.isPending || editar.isPending}>
              {esEditar ? "Guardar cambios" : "Crear insumo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
