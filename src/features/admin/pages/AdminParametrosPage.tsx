import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import {
  ESCALA_PORCENTAJE,
  fraccionAPorcentaje,
  parsearEntradaNumerica,
  porcentajeAFraccion,
} from "@/lib/decimal";
import { useParametrosSistema, useActualizarParametros } from "../hooks/useParametrosSistema";

/**
 * S-41 — parámetros globales. `PUT /proyectos/parametros-sistema` existe
 * (SUPER_ADMIN); lo que faltaba era el formulario. Diez de los once campos
 * numéricos son `@NotNull`, así que mandar los cuatro de antes devolvía 400:
 * encender el botón sin completar el formulario habría cambiado un tooltip por
 * un error.
 *
 * Los rangos HM, CI e IVA acotan los parámetros de cada proyecto. El DTO aún
 * transporta los rangos de descuento exigidos por el backend, pero no los expone
 * como funcionalidad editable porque descuento global fue retirado.
 */

// La API guarda fracciones en [0, 1] (`precision 5, scale 4` en la entidad), pero
// la UI las edita como porcentaje 0–100 %, igual que ParametrosPage: se siembran
// con `fraccionAPorcentaje` y se mandan con `porcentajeAFraccion`. Se teclean
// como texto y se cuantizan una sola vez, en la frontera de entrada (plan 061).
const fraccion = z
  .string()
  .refine((v) => parsearEntradaNumerica(v, ESCALA_PORCENTAJE) !== null, "Ingresa un número válido")
  .refine((v) => {
    const n = parsearEntradaNumerica(v, ESCALA_PORCENTAJE);
    return n !== null && n >= 0 && n <= 100;
  }, "Debe estar entre 0 y 100 %");

const RANGOS = [
  ["rangoHmMin", "rangoHmMax", "HM"],
  ["rangoCiMin", "rangoCiMax", "CI"],
  ["rangoIvaMin", "rangoIvaMax", "IVA"],
] as const;

const esquema = z
  .object({
    porcentajeHerramientaMenor: fraccion,
    // El único nullable de la entidad: vacío se manda como null, no como 0.
    porcentajeIndirecto: z.union([z.literal(""), fraccion]),
    iva: fraccion,
    rangoHmMin: fraccion,
    rangoHmMax: fraccion,
    rangoCiMin: fraccion,
    rangoCiMax: fraccion,
    rangoDescuentoMin: fraccion,
    rangoDescuentoMax: fraccion,
    rangoIvaMin: fraccion,
    rangoIvaMax: fraccion,
    moneda: z.string().max(10, "Máximo 10 caracteres"),
  })
  // Los rangos son la fuente autoritativa de PUT /proyectos/{id}/parametros:
  // un min por encima del max deja el rango vacío y bloquea esa pantalla.
  .superRefine((datos, ctx) => {
    for (const [min, max] of RANGOS) {
      const nMin = parsearEntradaNumerica(datos[min], ESCALA_PORCENTAJE);
      const nMax = parsearEntradaNumerica(datos[max], ESCALA_PORCENTAJE);
      if (nMin !== null && nMax !== null && nMin > nMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [max],
          message: "El máximo no puede ser menor que el mínimo",
        });
      }
    }
  });

type FormularioParametros = z.infer<typeof esquema>;

const num = (v: string) => porcentajeAFraccion(parsearEntradaNumerica(v, ESCALA_PORCENTAJE) ?? 0);
const pct = (fraccion: number) => String(fraccionAPorcentaje(fraccion));

export function AdminParametrosPage() {
  const { data, isLoading } = useParametrosSistema();
  const actualizar = useActualizarParametros();

  const form = useForm<FormularioParametros>({
    resolver: zodResolver(esquema),
    // `values` en vez de `defaultValues`: los parámetros llegan del servidor y
    // el formulario se resiembra solo cuando cambian.
    values: data && {
      porcentajeHerramientaMenor: pct(data.porcentajeHerramientaMenor),
      porcentajeIndirecto: data.porcentajeIndirecto == null ? "" : pct(data.porcentajeIndirecto),
      iva: pct(data.iva),
      rangoHmMin: pct(data.rangoHmMin),
      rangoHmMax: pct(data.rangoHmMax),
      rangoCiMin: pct(data.rangoCiMin),
      rangoCiMax: pct(data.rangoCiMax),
      rangoDescuentoMin: pct(data.rangoDescuentoMin),
      rangoDescuentoMax: pct(data.rangoDescuentoMax),
      rangoIvaMin: pct(data.rangoIvaMin),
      rangoIvaMax: pct(data.rangoIvaMax),
      moneda: data.moneda,
    },
  });

  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((valores) =>
    actualizar.mutate({
      porcentajeHerramientaMenor: num(valores.porcentajeHerramientaMenor),
      porcentajeIndirecto:
        valores.porcentajeIndirecto.trim() === "" ? null : num(valores.porcentajeIndirecto),
      iva: num(valores.iva),
      rangoHmMin: num(valores.rangoHmMin),
      rangoHmMax: num(valores.rangoHmMax),
      rangoCiMin: num(valores.rangoCiMin),
      rangoCiMax: num(valores.rangoCiMax),
      rangoDescuentoMin: num(valores.rangoDescuentoMin),
      rangoDescuentoMax: num(valores.rangoDescuentoMax),
      rangoIvaMin: num(valores.rangoIvaMin),
      rangoIvaMax: num(valores.rangoIvaMax),
      moneda: valores.moneda,
    }),
  );

  if (isLoading)
    return (
      <>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </>
    );

  const campoFraccion = (nombre: keyof FormularioParametros, etiqueta: string) => (
    <Field>
      <Label htmlFor={nombre}>{etiqueta}</Label>
      {/* Texto, no `type="number"`: ese input delega el separador decimal al
          locale del navegador y en español pinta «0,1800» donde el requisito es
          punto. El campo ya era un string validado por `fraccion` (zod +
          `parsearEntradaNumerica`), que acepta punto y coma y acota a [0, 1]. */}
      <div className="flex items-center gap-2">
        <Input
          id={nombre}
          type="text"
          inputMode="decimal"
          className="font-mono w-40"
          {...form.register(nombre)}
        />
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          %
        </span>
      </div>
      {errors[nombre] && <FieldError>{errors[nombre]?.message}</FieldError>}
    </Field>
  );

  return (
    <>
      <EncabezadoPagina titulo="Parámetros del sistema" />
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campoFraccion("porcentajeHerramientaMenor", "% Herramienta menor (0–100 %)")}
            {campoFraccion("porcentajeIndirecto", "% Costos indirectos (0–100 %)")}
            {campoFraccion("iva", "IVA (0–100 %)")}

            <div className="pt-2">
              <h3 className="text-sm font-medium">Rangos configurables</h3>
              <p className="text-sm text-muted-foreground">
                Acotan lo que se puede introducir en los parámetros de cada proyecto.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {RANGOS.map(([min, max, nombre]) => (
                <div key={nombre} className="contents">
                  {campoFraccion(min, `Rango ${nombre} mínimo (0–100 %)`)}
                  {campoFraccion(max, `Rango ${nombre} máximo (0–100 %)`)}
                </div>
              ))}
            </div>

            <Field>
              <Label htmlFor="moneda">Moneda</Label>
              <Input id="moneda" maxLength={10} className="w-40" {...form.register("moneda")} />
              {errors.moneda && <FieldError>{errors.moneda.message}</FieldError>}
            </Field>

            <Button type="submit" disabled={actualizar.isPending}>
              {actualizar.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
