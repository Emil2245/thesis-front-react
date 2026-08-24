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

const editarSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo: z.string().min(1, "El código es obligatorio"),
  direccionInstitucional: z.string().optional(),
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
  const proyectoId = Number(id);
  const navigate = useNavigate();
  const { data: proyecto } = useProyecto(proyectoId);
  const editar = useEditarProyecto(proyectoId);

  const form = useForm<EditarForm>({
    resolver: zodResolver(editarSchema),
    values: proyecto
      ? {
          nombre: proyecto.nombreProyecto,
          codigo: proyecto.codigo,
          direccionInstitucional: proyecto.direccionInstitucional ?? "",
          anio: proyecto.anio,
        }
      : undefined,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await editar.mutateAsync(data);
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
            <Input id="edit-nombre" {...form.register("nombre")} />
            <FieldError>{form.formState.errors.nombre?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="edit-codigo">Código</Label>
            <Input id="edit-codigo" {...form.register("codigo")} />
            <FieldError>{form.formState.errors.codigo?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="edit-direccion">Dirección institucional</Label>
            <Input id="edit-direccion" {...form.register("direccionInstitucional")} />
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
