import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { useDuplicarProyecto } from "../hooks/useProyectos";
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
import { Button } from "@/components/ui/button";

const duplicarSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo: z.string().min(1, "El código es obligatorio"),
});

export function DialogoDuplicar({ abierto, onClose }: { abierto: boolean; onClose: () => void }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const duplicar = useDuplicarProyecto();
  const form = useForm({
    resolver: zodResolver(duplicarSchema),
    defaultValues: { nombre: "", codigo: "" },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const res = await duplicar.mutateAsync({ id: Number(id), body: data });
    toast.success("Proyecto duplicado");
    onClose();
    navigate(`/proyectos/${res.id}`);
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar proyecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se copiará la versión vigente, los insumos, los parámetros y los firmantes.
          </p>
          <Field>
            <Label htmlFor="dup-nombre">Nombre</Label>
            <Input id="dup-nombre" {...form.register("nombre")} />
            <FieldError>{form.formState.errors.nombre?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="dup-codigo">Código</Label>
            <Input id="dup-codigo" {...form.register("codigo")} />
            <FieldError>{form.formState.errors.codigo?.message}</FieldError>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={duplicar.isPending}>
            Duplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
