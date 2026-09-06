import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useEditarProyecto } from "../hooks/useProyectos";
import { useProyecto } from "../hooks/useProyectos";
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

const editarSchema = z.object({
  nombreProyecto: z.string().min(1, "El nombre es obligatorio"),
  codigo: z.string().min(1, "El código es obligatorio"),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z.number().int().min(1).max(600).optional(),
  plazoUnidad: z.enum(["SEMANA", "MES"]).optional(),
  // @NotBlank en ProyectoEditarRequest, igual que nombreProyecto.
  direccionInstitucional: z.string().min(1, "La dirección es obligatoria"),
  subdireccionInstitucional: z.string().optional(),
  anio: z.number().int().min(2000).max(2100).optional(),
});

type EditarForm = z.infer<typeof editarSchema>;

export function DialogoEditarProyecto({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const { id } = useParams();
  const proyectoId = id ?? "";
  const navigate = useNavigate();
  const { data: proyecto } = useProyecto(proyectoId);
  const editar = useEditarProyecto(proyectoId);

  const form = useForm<EditarForm>({
    resolver: zodResolver(editarSchema),
    values: proyecto
      ? {
          nombreProyecto: proyecto.nombreProyecto,
          codigo: proyecto.codigo,
          descripcion: proyecto.descripcion ?? "",
          fechaInicio: proyecto.fechaInicio ?? "",
          plazoEjecucion: proyecto.plazoEjecucion,
          plazoUnidad:
            proyecto.plazoUnidad === "SEMANA" || proyecto.plazoUnidad === "MES"
              ? proyecto.plazoUnidad
              : undefined,
          direccionInstitucional: proyecto.direccionInstitucional ?? "",
          subdireccionInstitucional: proyecto.subdireccionInstitucional ?? "",
          anio: proyecto.anio,
        }
      : undefined,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await editar.mutateAsync({
      nombreProyecto: data.nombreProyecto,
      codigo: data.codigo,
      descripcion: data.descripcion || undefined,
      fechaInicio: data.fechaInicio || undefined,
      plazoEjecucion: data.plazoEjecucion || undefined,
      plazoUnidad: data.plazoUnidad || undefined,
      direccionInstitucional: data.direccionInstitucional,
      subdireccionInstitucional: data.subdireccionInstitucional || undefined,
      anio: data.anio,
    });
    toast.success("Proyecto actualizado");
    onClose();
    navigate(`/proyectos/${proyectoId}`);
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar proyecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input id="edit-nombre" {...form.register("nombreProyecto")} />
            <FieldError>{form.formState.errors.nombreProyecto?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="edit-codigo">Código</Label>
            <Input id="edit-codigo" {...form.register("codigo")} />
            <FieldError>{form.formState.errors.codigo?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="edit-descripcion">Descripción</Label>
            <Input id="edit-descripcion" {...form.register("descripcion")} />
          </Field>
          <Field>
            <Label htmlFor="edit-fechaInicio">Fecha de inicio</Label>
            <Input id="edit-fechaInicio" type="date" {...form.register("fechaInicio")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="edit-plazo">Plazo de ejecución</Label>
              <Input
                id="edit-plazo"
                type="number"
                {...form.register("plazoEjecucion", { valueAsNumber: true })}
              />
              <FieldError>{form.formState.errors.plazoEjecucion?.message}</FieldError>
            </Field>
            <Field>
              <Label>Unidad de plazo</Label>
              <Select
                value={form.watch("plazoUnidad")}
                onValueChange={(v) => form.setValue("plazoUnidad", v as "SEMANA" | "MES")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MES">Meses</SelectItem>
                  <SelectItem value="SEMANA">Semanas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <Label htmlFor="edit-direccion">Dirección institucional</Label>
            <Input id="edit-direccion" {...form.register("direccionInstitucional")} />
          </Field>
          <Field>
            <Label htmlFor="edit-subdireccion">Subdirección institucional</Label>
            <Input id="edit-subdireccion" {...form.register("subdireccionInstitucional")} />
          </Field>
          <Field>
            <Label htmlFor="edit-anio">Año</Label>
            <Input
              id="edit-anio"
              type="number"
              {...form.register("anio", { valueAsNumber: true })}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={editar.isPending}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
