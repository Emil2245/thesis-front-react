import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { crearParametrosSchema, type RangosValidacion } from "../schemas";
import {
  useParametros,
  useActualizarParametros,
  useParametrosCi,
  useGuardarParametrosCi,
} from "../hooks/useParametros";
import { useParametrosSistema } from "@/features/admin/hooks/useParametrosSistema";
import {
  ESCALA_PORCENTAJE,
  fraccionAPorcentaje,
  parsearEntradaNumerica,
  porcentajeAFraccion,
} from "@/lib/decimal";
import { CargandoTabla } from "@/components/comunes/CargandoTabla";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { ParametrosProyectoCiRequest } from "@/api/contract";

// `type="number"` delega el separador decimal al locale del NAVEGADOR: en un
// Chrome en español el 12.5 que manda el servidor se pinta «12,5». El requisito
// es punto siempre, así que estos campos viajan como texto y la conversión la
// hace `parsearEntradaNumerica`, que acepta las dos formas y cuantiza una sola
// vez (frontera de entrada, ADR 9).
const aPorcentaje = (v: unknown) =>
  parsearEntradaNumerica(String(v ?? ""), ESCALA_PORCENTAJE) ?? NaN;

const aPorcentajeNullable = (v: unknown) => (String(v ?? "").trim() === "" ? null : aPorcentaje(v));

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
  const proyectoId = id ?? "";
  const navigate = useNavigate();
  const { data: params, isPending } = useParametros(proyectoId);
  const { data: sistema } = useParametrosSistema();
  const actualizar = useActualizarParametros(proyectoId);
  const ciQuery = useParametrosCi(proyectoId);
  const guardarCi = useGuardarParametrosCi(proyectoId);
  const [ciValor, setCiValor] = useState("");
  const [ciIndividual, setCiIndividual] = useState(false);
  const [ciError, setCiError] = useState("");
  const [confirmacion, setConfirmacion] = useState<ParametrosProyectoCiRequest | null>(null);

  useEffect(() => {
    if (ciQuery.data) {
      setCiValor(
        ciQuery.data.porcentajeIndirecto == null
          ? ""
          : String(fraccionAPorcentaje(ciQuery.data.porcentajeIndirecto)),
      );
      setCiIndividual(ciQuery.data.ciIndividualHabilitado);
    }
  }, [ciQuery.data]);

  const rangos = useMemo<RangosValidacion>(
    () => ({
      hmMax: sistema?.rangoHmMax ? fraccionAPorcentaje(sistema.rangoHmMax) : 20,
      ciMax: sistema?.rangoCiMax ? fraccionAPorcentaje(sistema.rangoCiMax) : 100,
      ivaMax: sistema?.rangoIvaMax ? fraccionAPorcentaje(sistema.rangoIvaMax) : 30,
      descuentoMax: sistema?.rangoDescuentoMax
        ? fraccionAPorcentaje(sistema.rangoDescuentoMax)
        : 50,
    }),
    [sistema],
  );

  const schema = useMemo(() => crearParametrosSchema(rangos), [rangos]);

  const form = useForm({
    resolver: zodResolver(schema),
    values: params
      ? {
          porcentajeHerramientaMenor: fraccionAPorcentaje(params.porcentajeHerramientaMenor),
          porcentajeIndirecto: params.porcentajeIndirecto
            ? fraccionAPorcentaje(params.porcentajeIndirecto)
            : null,
          iva: fraccionAPorcentaje(params.iva),
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
          Configure aquí los parámetros generales del proyecto. El CI del proyecto y los CI propios
          se administran por separado en la tarjeta siguiente.
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
                type="text"
                inputMode="decimal"
                {...form.register("porcentajeHerramientaMenor", { setValueAs: aPorcentaje })}
              />
              <FieldError>{form.formState.errors.porcentajeHerramientaMenor?.message}</FieldError>
            </Field>
            <Field>
              <Label>{`IVA (0–${rangos.ivaMax} %)`}</Label>
              <Input
                type="text"
                inputMode="decimal"
                {...form.register("iva", { setValueAs: aPorcentaje })}
              />
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
            <CardTitle className="text-sm font-medium">Costos indirectos del proyecto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ciQuery.isPending ? (
              <p className="text-sm text-muted-foreground">Cargando configuración de CI…</p>
            ) : ciQuery.isError || !ciQuery.data ? (
              <p role="alert" className="text-sm text-destructive">
                No se pudo cargar la configuración de CI. Recargue la página para editarla.
              </p>
            ) : (
              <>
                <Field>
                  <Label htmlFor="proyecto-ci-porcentaje">
                    % CI del proyecto (0–{rangos.ciMax} %)
                  </Label>
                  <Input
                    id="proyecto-ci-porcentaje"
                    type="text"
                    inputMode="decimal"
                    value={ciValor}
                    aria-invalid={!!ciError}
                    onChange={(event) => {
                      setCiValor(event.target.value);
                      setCiError("");
                    }}
                  />
                  <FieldError>{ciError}</FieldError>
                </Field>
                <div className="flex items-center gap-2">
                  <Switch
                    id="ci-individual-habilitado"
                    aria-label="Habilitar CI individual por APU"
                    checked={ciIndividual}
                    onCheckedChange={setCiIndividual}
                    disabled={guardarCi.isPending}
                  />
                  <Label htmlFor="ci-individual-habilitado">Permitir CI individual por APU</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ciQuery.data.cantidadOverrides} APU con CI propio. Deshabilitar esta opción
                  restablece sus valores al CI del proyecto.
                </p>
                {guardarCi.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    No se pudo guardar el CI del proyecto. Revise el valor e intente nuevamente.
                  </p>
                )}
                <Button
                  type="button"
                  disabled={guardarCi.isPending}
                  onClick={async () => {
                    const porcentaje = aPorcentajeNullable(ciValor);
                    if (Number.isNaN(porcentaje)) {
                      setCiError("Ingrese un porcentaje válido.");
                      return;
                    }
                    if (
                      porcentaje != null &&
                      (porcentaje < (sistema?.rangoCiMin ?? 0) * 100 || porcentaje > rangos.ciMax)
                    ) {
                      setCiError(
                        `El CI debe estar entre ${fraccionAPorcentaje(sistema?.rangoCiMin ?? 0)} y ${rangos.ciMax} %.`,
                      );
                      return;
                    }
                    const solicitud: ParametrosProyectoCiRequest = {
                      porcentajeIndirecto:
                        porcentaje == null ? null : porcentajeAFraccion(porcentaje),
                      ciIndividualHabilitado: ciIndividual,
                    };
                    const cambioCi =
                      ciQuery.data.porcentajeIndirecto == null
                        ? solicitud.porcentajeIndirecto != null
                        : solicitud.porcentajeIndirecto == null ||
                          ciQuery.data.porcentajeIndirecto !== solicitud.porcentajeIndirecto;
                    const requiereDecision =
                      ciQuery.data.cantidadOverrides > 0 &&
                      (cambioCi || (ciQuery.data.ciIndividualHabilitado && !ciIndividual));
                    if (requiereDecision) {
                      setConfirmacion(solicitud);
                      return;
                    }
                    try {
                      await guardarCi.mutateAsync({ ...solicitud, politicaOverrides: "PRESERVAR" });
                      toast.success("CI del proyecto actualizado");
                    } catch {
                      // The inline alert exposes the failed save without losing the input.
                    }
                  }}
                >
                  {guardarCi.isPending ? "Guardando CI…" : "Guardar CI"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={confirmacion !== null}
          onOpenChange={(open) => !open && setConfirmacion(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Qué hacer con los CI propios?</DialogTitle>
              <DialogDescription>
                Hay {ciQuery.data?.cantidadOverrides ?? 0} APU con un CI propio. Elija cómo
                continuar; no se cambiará nada hasta confirmar.
              </DialogDescription>
            </DialogHeader>
            {guardarCi.isError && (
              <p role="alert" className="text-sm text-destructive">
                No se pudo guardar el CI. Sus valores no se han cambiado; intente nuevamente.
              </p>
            )}
            <DialogFooter className="flex-col sm:flex-col sm:items-stretch">
              {confirmacion?.ciIndividualHabilitado && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={guardarCi.isPending}
                  onClick={async () => {
                    if (!confirmacion) return;
                    try {
                      await guardarCi.mutateAsync({
                        ...confirmacion,
                        politicaOverrides: "PRESERVAR",
                      });
                      setConfirmacion(null);
                      toast.success("CI del proyecto actualizado; se conservaron los CI propios");
                    } catch {
                      // Keep the explicit choice open so the user can retry.
                    }
                  }}
                >
                  Conservar los CI propios
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={guardarCi.isPending}
                onClick={async () => {
                  if (!confirmacion) return;
                  try {
                    await guardarCi.mutateAsync({
                      ...confirmacion,
                      politicaOverrides: "RESTABLECER",
                    });
                    setConfirmacion(null);
                    toast.success("CI actualizado y valores propios restablecidos");
                  } catch {
                    // Keep the explicit choice open so the user can retry.
                  }
                }}
              >
                Restablecer todos los CI propios
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmacion(null)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
