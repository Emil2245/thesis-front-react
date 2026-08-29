import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { crearParametrosSchema, type RangosValidacion } from "../schemas";
import { useParametros, useActualizarParametros } from "../hooks/useParametros";
import { useParametrosSistema } from "@/features/admin/hooks/useParametrosSistema";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function ParametroSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <Label className="text-sm">{label}</Label>
    </div>
  );
}

export function ParametrosPage() {
  const { id } = useParams();
  const proyectoId = Number(id);
  const navigate = useNavigate();
  const { data: params, isPending } = useParametros(proyectoId);
  const { data: sistema } = useParametrosSistema();
  const actualizar = useActualizarParametros(proyectoId);

  const rangos = useMemo<RangosValidacion>(
    () => ({
      hmMax: sistema?.rangoHmMax ? Number(sistema.rangoHmMax) * 100 : 20,
      ciMax: sistema?.rangoCiMax ? Number(sistema.rangoCiMax) * 100 : 100,
      ivaMax: sistema?.rangoIvaMax ? Number(sistema.rangoIvaMax) * 100 : 30,
      descuentoMax: sistema?.rangoDescuentoMax ? Number(sistema.rangoDescuentoMax) * 100 : 50,
    }),
    [sistema],
  );

  const schema = useMemo(() => crearParametrosSchema(rangos), [rangos]);

  const form = useForm({
    resolver: zodResolver(schema),
    values: params
      ? {
          porcentajeHerramientaMenor: Number(params.porcentajeHerramientaMenor) * 100,
          porcentajeIndirecto: params.porcentajeIndirecto
            ? Number(params.porcentajeIndirecto) * 100
            : null,
          iva: Number(params.iva) * 100,
          moneda: params.moneda,
          mostrarSeccionesVacias: params.mostrarSeccionesVacias,
          sufijosSeccionActivos: params.sufijosSeccionActivos,
          mostrarSubtotalesSeccion: params.mostrarSubtotalesSeccion,
          mostrarSubtotalesPie: params.mostrarSubtotalesPie,
          mostrarNombreProyectoHeader: params.mostrarNombreProyectoHeader,
          enumerarApus: params.enumerarApus,
          mensajeFooter: params.mensajeFooter ?? "",
          modoCodigoRubro: params.modoCodigoRubro,
        }
      : undefined,
  });

  if (isPending) return <CargandoTabla />;
  if (!params) return <p className="text-muted-foreground">Parámetros no encontrados</p>;

  const handleGuardar = form.handleSubmit(async (values) => {
    try {
      await actualizar.mutateAsync(values);
      toast.success("Parámetros actualizados");
      navigate(`/proyectos/${proyectoId}`);
    } catch {
      toast.error("Error al guardar parámetros");
    }
  });

  return (
    <>
      <EncabezadoPagina titulo="Parámetros del proyecto" />

      <Alert>
        <TriangleAlertIcon />
        <AlertDescription>
          Guardar los parámetros recalculará el porcentaje de herramienta menor en todos los APUs y
          propagará el % de indirectos a los APUs sin valor personalizado.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cálculo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field>
              <Label>{`% Herramienta menor (0–${rangos.hmMax} %)`}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("porcentajeHerramientaMenor", { valueAsNumber: true })}
              />
              <FieldError>{form.formState.errors.porcentajeHerramientaMenor?.message}</FieldError>
            </Field>
            <Field>
              <Label>{`% Indirectos (0–${rangos.ciMax} %)`}</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register("porcentajeIndirecto", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" ? null : Number(v)),
                })}
              />
              <FieldError>{form.formState.errors.porcentajeIndirecto?.message}</FieldError>
            </Field>
            <Field>
              <Label>{`IVA (0–${rangos.ivaMax} %)`}</Label>
              <Input type="number" step="0.01" {...form.register("iva", { valueAsNumber: true })} />
              <FieldError>{form.formState.errors.iva?.message}</FieldError>
            </Field>
            <Field>
              <Label>Moneda</Label>
              <Select
                value={form.watch("moneda")}
                onValueChange={(v) => form.setValue("moneda", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Presentación</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <ParametroSwitch
              label="Mostrar secciones vacías"
              checked={form.watch("mostrarSeccionesVacias")}
              onCheckedChange={(v) => form.setValue("mostrarSeccionesVacias", v)}
            />
            <ParametroSwitch
              label="Sufijos de sección activos"
              checked={form.watch("sufijosSeccionActivos")}
              onCheckedChange={(v) => form.setValue("sufijosSeccionActivos", v)}
            />
            <ParametroSwitch
              label="Subtotales por sección"
              checked={form.watch("mostrarSubtotalesSeccion")}
              onCheckedChange={(v) => form.setValue("mostrarSubtotalesSeccion", v)}
            />
            <ParametroSwitch
              label="Subtotales al pie"
              checked={form.watch("mostrarSubtotalesPie")}
              onCheckedChange={(v) => form.setValue("mostrarSubtotalesPie", v)}
            />
            <ParametroSwitch
              label="Nombre del proyecto en header"
              checked={form.watch("mostrarNombreProyectoHeader")}
              onCheckedChange={(v) => form.setValue("mostrarNombreProyectoHeader", v)}
            />
            <ParametroSwitch
              label="Enumerar APUs"
              checked={form.watch("enumerarApus")}
              onCheckedChange={(v) => form.setValue("enumerarApus", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Codificación</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={form.watch("modoCodigoRubro")}
              onValueChange={(v) =>
                form.setValue("modoCodigoRubro", v as "AUTOGENERADO" | "MANUAL")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTOGENERADO">Autogenerado</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/proyectos/${proyectoId}`)}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={actualizar.isPending}>
            {actualizar.isPending ? "Guardando…" : "Guardar parámetros"}
          </Button>
        </div>
      </div>
    </>
  );
}
