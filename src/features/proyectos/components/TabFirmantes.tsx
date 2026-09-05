import { useState } from "react";
import { useFirmantes, useCrearFirmante, useEliminarFirmante } from "../hooks/useFirmantes";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { firmanteSchema, type FirmanteFormData } from "../schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function DialogoFirmante({
  abierto,
  onClose,
  onGuardar,
}: {
  abierto: boolean;
  onClose: () => void;
  onGuardar: (data: FirmanteFormData) => Promise<void>;
}) {
  const form = useForm<FirmanteFormData>({
    resolver: zodResolver(firmanteSchema),
    defaultValues: { nombre: "", cargo: "", rol: "CONSOLIDADO", orden: 1 },
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Firmante</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <Label htmlFor="f-nombre">Nombre</Label>
            <Input id="f-nombre" {...form.register("nombre")} />
            <FieldError>{form.formState.errors.nombre?.message}</FieldError>
          </Field>
          <Field>
            <Label htmlFor="f-cargo">Cargo</Label>
            <Input id="f-cargo" {...form.register("cargo")} />
            <FieldError>{form.formState.errors.cargo?.message}</FieldError>
          </Field>
          <Field>
            <Label>Rol</Label>
            <Select
              value={form.watch("rol")}
              onValueChange={(v) => form.setValue("rol", v as "CONSOLIDADO" | "APROBADO")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSOLIDADO">Consolidado</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="f-orden">Orden</Label>
            <Input
              id="f-orden"
              type="number"
              {...form.register("orden", { valueAsNumber: true })}
            />
            <FieldError>{form.formState.errors.orden?.message}</FieldError>
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={form.handleSubmit(onGuardar)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TabFirmantes({ proyectoId }: { proyectoId: string }) {
  const { data: firmantes } = useFirmantes(proyectoId);
  const crear = useCrearFirmante(proyectoId);
  const eliminar = useEliminarFirmante(proyectoId);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  const handleCrear = async (data: FirmanteFormData) => {
    await crear.mutateAsync(data);
    toast.success("Firmante agregado");
    setDialogoAbierto(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Firmantes</CardTitle>
        <Button size="sm" onClick={() => setDialogoAbierto(true)}>
          <PlusIcon /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {!firmantes?.length ? (
          <p className="text-sm text-muted-foreground">Sin firmantes registrados</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Orden</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {firmantes.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.nombre}</TableCell>
                  <TableCell>{f.cargo}</TableCell>
                  <TableCell>{f.rol === "CONSOLIDADO" ? "Consolidado" : "Aprobado"}</TableCell>
                  <TableCell>{f.orden}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => eliminar.mutate(f.id)}>
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DialogoFirmante
        abierto={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        onGuardar={handleCrear}
      />
    </Card>
  );
}
