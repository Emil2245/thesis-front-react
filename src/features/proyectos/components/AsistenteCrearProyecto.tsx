import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { proyectoSchema, type ProyectoFormData } from "../schemas";
import { useCrearProyecto } from "../hooks/useProyectos";
import type { ProyectoCrearRequest } from "@/api/contract";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const PASOS = ["Datos generales", "Confirmar"];

export function AsistenteCrearProyecto({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const crear = useCrearProyecto();
  const [paso, setPaso] = useState(0);

  const form = useForm<ProyectoFormData>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombreProyecto: "",
      codigo: "",
      descripcion: "",
      plazoUnidad: "MES",
    },
  });

  const avanzar = async () => {
    if (paso === 0) {
      const ok = await form.trigger(["nombreProyecto"]);
      if (!ok) return;
    }
    if (paso < PASOS.length - 1) {
      setPaso((p) => p + 1);
    }
  };

  const handleCrear = async () => {
    const data = form.getValues();
    const body: ProyectoCrearRequest = {
      nombreProyecto: data.nombreProyecto,
      codigo: data.codigo || undefined,
      descripcion: data.descripcion || undefined,
      anio: data.anio || undefined,
      fechaInicio: data.fechaInicio || undefined,
      plazoEjecucion: data.plazoEjecucion || undefined,
      plazoUnidad: data.plazoUnidad ?? undefined,
      direccionInstitucional: data.direccionInstitucional || undefined,
      subdireccionInstitucional: data.subdireccionInstitucional || undefined,
    };
    try {
      const res = await crear.mutateAsync(body);
      toast.success("Proyecto creado");
      onClose();
      navigate(`/proyectos/${res.id}`);
    } catch {
      toast.error("Error al crear el proyecto");
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear proyecto</DialogTitle>
          <DialogDescription>
            Paso {paso + 1} de 2 — {PASOS[paso]}
          </DialogDescription>
        </DialogHeader>

        {paso === 0 && (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="nombreProyecto">Nombre</Label>
              <Input id="nombreProyecto" {...form.register("nombreProyecto")} />
              <FieldError>{form.formState.errors.nombreProyecto?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" {...form.register("codigo")} />
              <FieldError>{form.formState.errors.codigo?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" {...form.register("descripcion")} />
            </Field>
            <Field>
              <Label htmlFor="fechaInicio">Fecha de inicio</Label>
              <Input id="fechaInicio" type="date" {...form.register("fechaInicio")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label htmlFor="anio">Año</Label>
                <Input
                  id="anio"
                  type="number"
                  {...form.register("anio", { valueAsNumber: true })}
                />
                <FieldError>{form.formState.errors.anio?.message}</FieldError>
              </Field>
              <Field>
                <Label htmlFor="plazo">Plazo de ejecución</Label>
                <Input
                  id="plazo"
                  type="number"
                  {...form.register("plazoEjecucion", { valueAsNumber: true })}
                />
                <FieldError>{form.formState.errors.plazoEjecucion?.message}</FieldError>
              </Field>
            </div>
            <Field>
              <Label>Unidad de plazo</Label>
              <Select
                value={form.watch("plazoUnidad")}
                onValueChange={(v) => form.setValue("plazoUnidad", v as "SEMANA" | "MES")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MES">Meses</SelectItem>
                  <SelectItem value="SEMANA">Semanas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="direccion">Dirección institucional</Label>
              <Input id="direccion" {...form.register("direccionInstitucional")} />
            </Field>
            <Field>
              <Label htmlFor="subdireccion">Subdirección institucional</Label>
              <Input id="subdireccion" {...form.register("subdireccionInstitucional")} />
            </Field>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-2 text-sm">
            <p>
              <strong>Nombre:</strong> {form.watch("nombreProyecto")}
            </p>
            <p>
              <strong>Código:</strong> {form.watch("codigo") || "—"}
            </p>
            <p>
              <strong>Año/Plazo:</strong> {form.watch("anio") ?? "—"} ·{" "}
              {form.watch("plazoEjecucion") ?? "—"}{" "}
              {form.watch("plazoUnidad") === "SEMANA" ? "semanas" : "meses"}
            </p>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {paso > 0 && (
            <Button variant="outline" onClick={() => setPaso((p) => p - 1)}>
              <ChevronLeftIcon /> Atrás
            </Button>
          )}
          {paso < PASOS.length - 1 ? (
            <Button onClick={avanzar}>
              Siguiente <ChevronRightIcon />
            </Button>
          ) : (
            <Button onClick={handleCrear} disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear proyecto"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
