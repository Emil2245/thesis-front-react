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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const PASOS = ["Datos generales", "Origen de insumos", "Confirmar"];

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
  const [origen, setOrigen] = useState<"CENTRAL" | "PROYECTO" | "VACIA">("VACIA");

  const form = useForm<ProyectoFormData>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: "",
      codigo: "",
      origenInsumos: { tipo: "VACIA" },
    },
  });

  const avanzar = async () => {
    if (paso === 0) {
      const ok = await form.trigger(["nombre", "codigo"]);
      if (!ok) return;
    }
    if (paso < PASOS.length - 1) {
      setPaso((p) => p + 1);
    }
  };

  const handleCrear = async () => {
    const data = form.getValues();
    const body: ProyectoCrearRequest = {
      nombre: data.nombre,
      codigo: data.codigo,
      direccionInstitucional: data.direccionInstitucional,
      anio: data.anio,
      origenInsumos: { tipo: origen },
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
            Paso {paso + 1} de 3 — {PASOS[paso]}
          </DialogDescription>
        </DialogHeader>

        {paso === 0 && (
          <div className="space-y-4">
            <Field>
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register("nombre")} />
              <FieldError>{form.formState.errors.nombre?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="codigo">Código</Label>
              <Input id="codigo" {...form.register("codigo")} />
              <FieldError>{form.formState.errors.codigo?.message}</FieldError>
            </Field>
            <Field>
              <Label htmlFor="direccion">Dirección institucional</Label>
              <Input id="direccion" {...form.register("direccionInstitucional")} />
            </Field>
            <Field>
              <Label htmlFor="anio">Año</Label>
              <Input id="anio" type="number" {...form.register("anio", { valueAsNumber: true })} />
              <FieldError>{form.formState.errors.anio?.message}</FieldError>
            </Field>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿De dónde copiar la base de insumos inicial?
            </p>
            <RadioGroup value={origen} onValueChange={(v) => setOrigen(v as typeof origen)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="VACIA" id="r-vacia" />
                <Label htmlFor="r-vacia">Empezar vacío</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="CENTRAL" id="r-central" />
                <Label htmlFor="r-central">Copiar de una base central</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="PROYECTO" id="r-proyecto" />
                <Label htmlFor="r-proyecto">Copiar de otro proyecto</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-2 text-sm">
            <p>
              <strong>Nombre:</strong> {form.watch("nombre")}
            </p>
            <p>
              <strong>Código:</strong> {form.watch("codigo")}
            </p>
            <p>
              <strong>Origen insumos:</strong>{" "}
              {origen === "VACIA"
                ? "Vacío"
                : origen === "CENTRAL"
                  ? "Base central"
                  : "Otro proyecto"}
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
