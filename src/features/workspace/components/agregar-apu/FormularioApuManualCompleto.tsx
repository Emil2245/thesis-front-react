import { useRef, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";

import type {
  ApuManualCompletoRequest,
  ApuManualCompletoResponse,
  SeccionTipo,
} from "@/api/contract";
import { ApiError } from "@/api/problem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { SelectorInsumo } from "@/features/apu-editor/components/SelectorInsumo";
import { useCrearApuCompleto } from "@/features/apu-editor/hooks/useApus";
import { useInsumos } from "@/features/insumos/hooks/useInsumos";
import { useParametros } from "@/features/proyectos/hooks/useParametros";
import {
  asDecimal,
  ESCALA_PORCENTAJE,
  parsearEntradaNumerica,
  porcentajeAFraccion,
} from "@/lib/decimal";

const SECCIONES: readonly SeccionTipo[] = ["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"];
const CON_RENDIMIENTO = new Set<SeccionTipo>(["EQUIPO", "MANO_OBRA"]);

interface BorradorDetalle {
  id: number;
  seccionTipo: SeccionTipo;
  insumoId: string;
  cantidad: string;
  rendimiento: string;
}

type Errores = Record<string, string>;

export interface FormularioApuManualCompletoProps {
  presupuestoId: string;
  proyectoId: string;
  capituloId?: string;
  onCreado: (respuesta: ApuManualCompletoResponse) => void;
  onCancelar: () => void;
}

function decimalPositivo(valor: string) {
  const limpio = valor.trim().replace(",", ".");
  if (
    !/^\d+(?:\.\d{1,6})?$/.test(limpio) ||
    !Number.isFinite(Number(limpio)) ||
    Number(limpio) <= 0
  ) {
    return null;
  }
  const [entero, decimales = ""] = limpio.split(".");
  return asDecimal(`${entero}.${decimales.padEnd(6, "0")}`);
}

function errorDeMutacion(error: unknown) {
  if (error instanceof ApiError) return error.problem.mensaje;
  return "No se pudo crear el APU. Intente nuevamente.";
}

export function FormularioApuManualCompleto({
  presupuestoId,
  proyectoId,
  capituloId,
  onCreado,
  onCancelar,
}: FormularioApuManualCompletoProps) {
  const crear = useCrearApuCompleto(presupuestoId);
  const parametros = useParametros(proyectoId);
  const insumos = useInsumos(proyectoId, { size: 200 });
  const siguienteId = useRef(1);
  const enviandoRef = useRef(false);

  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [porcentajeIndirecto, setPorcentajeIndirecto] = useState("");
  const [borradores, setBorradores] = useState<BorradorDetalle[]>([]);
  const [selector, setSelector] = useState<SeccionTipo | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [resumenError, setResumenError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const modoAutogenerado = parametros.data?.modoCodigoRubro === "AUTOGENERADO";
  const listaInsumos = insumos.data?.contenido ?? [];

  const limpiarError = (campo: string) => {
    setErrores((actuales) => {
      if (!(campo in actuales)) return actuales;
      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });
    setResumenError("");
  };

  const reiniciar = () => {
    setCodigo("");
    setDescripcion("");
    setUnidad("");
    setPorcentajeIndirecto("");
    setBorradores([]);
    setSelector(null);
    setErrores({});
    setResumenError("");
  };

  const agregarBorrador = (seccionTipo: SeccionTipo, insumoId: string) => {
    setBorradores((actuales) => [
      ...actuales,
      {
        id: siguienteId.current++,
        seccionTipo,
        insumoId,
        cantidad: "1.000000",
        rendimiento: "",
      },
    ]);
    limpiarError("detalles");
  };

  const actualizarBorrador = (id: number, campo: "cantidad" | "rendimiento", valor: string) => {
    setBorradores((actuales) =>
      actuales.map((borrador) => (borrador.id === id ? { ...borrador, [campo]: valor } : borrador)),
    );
    limpiarError(`detalle-${id}-${campo}`);
  };

  const eliminarBorrador = (id: number) => {
    setBorradores((actuales) => actuales.filter((borrador) => borrador.id !== id));
    setErrores((actuales) =>
      Object.fromEntries(
        Object.entries(actuales).filter(([campo]) => !campo.startsWith(`detalle-${id}-`)),
      ),
    );
  };

  const moverBorrador = (seccionTipo: SeccionTipo, indice: number, desplazamiento: -1 | 1) => {
    setBorradores((actuales) => {
      const posiciones = actuales
        .map((borrador, posicion) => ({ borrador, posicion }))
        .filter(({ borrador }) => borrador.seccionTipo === seccionTipo);
      const destino = indice + desplazamiento;
      if (destino < 0 || destino >= posiciones.length) return actuales;
      const siguientes = [...actuales];
      const origenGlobal = posiciones[indice].posicion;
      const destinoGlobal = posiciones[destino].posicion;
      [siguientes[origenGlobal], siguientes[destinoGlobal]] = [
        siguientes[destinoGlobal],
        siguientes[origenGlobal],
      ];
      return siguientes;
    });
  };

  const validar = (): {
    body?: ApuManualCompletoRequest;
    primerCampo?: string;
    errores: Errores;
  } => {
    const nuevos: Errores = {};
    let primerCampo: string | undefined;
    const registrar = (campo: string, mensaje: string, idCampo: string) => {
      nuevos[campo] = mensaje;
      primerCampo ??= idCampo;
    };

    if (!modoAutogenerado) {
      if (!codigo.trim()) registrar("codigo", "El código es obligatorio", "apu-manual-codigo");
      else if (codigo.trim().length > 20)
        registrar("codigo", "El código admite máximo 20 caracteres", "apu-manual-codigo");
    }
    if (!descripcion.trim())
      registrar("descripcion", "La descripción es obligatoria", "apu-manual-descripcion");
    else if (descripcion.trim().length > 255)
      registrar(
        "descripcion",
        "La descripción admite máximo 255 caracteres",
        "apu-manual-descripcion",
      );
    if (!unidad.trim()) registrar("unidad", "La unidad es obligatoria", "apu-manual-unidad");
    else if (unidad.trim().length > 10)
      registrar("unidad", "La unidad admite máximo 10 caracteres", "apu-manual-unidad");

    let porcentaje: number | undefined;
    if (porcentajeIndirecto.trim()) {
      const puntos = parsearEntradaNumerica(porcentajeIndirecto, ESCALA_PORCENTAJE);
      if (puntos == null || puntos < 0 || puntos > 100) {
        registrar(
          "porcentajeIndirecto",
          "Ingrese un porcentaje entre 0 y 100",
          "apu-manual-porcentaje",
        );
      } else {
        porcentaje = porcentajeAFraccion(puntos);
      }
    }

    if (borradores.length === 0) {
      registrar("detalles", "Agregue al menos un insumo", "agregar-insumo-EQUIPO");
    }

    const detalles = SECCIONES.flatMap((seccionTipo) =>
      borradores
        .filter((borrador) => borrador.seccionTipo === seccionTipo)
        .map((borrador) => {
          const cantidad = decimalPositivo(borrador.cantidad);
          if (cantidad == null) {
            registrar(
              `detalle-${borrador.id}-cantidad`,
              "La cantidad debe ser mayor que cero",
              `detalle-${borrador.id}-cantidad`,
            );
          }
          const requiereRendimiento = CON_RENDIMIENTO.has(seccionTipo);
          const rendimiento = requiereRendimiento ? decimalPositivo(borrador.rendimiento) : null;
          if (requiereRendimiento && rendimiento == null) {
            registrar(
              `detalle-${borrador.id}-rendimiento`,
              "El rendimiento debe ser mayor que cero",
              `detalle-${borrador.id}-rendimiento`,
            );
          }
          return {
            seccionTipo,
            insumoId: borrador.insumoId,
            cantidad,
            ...(requiereRendimiento && rendimiento != null ? { rendimiento } : {}),
          };
        }),
    );

    if (Object.keys(nuevos).length > 0) return { errores: nuevos, primerCampo };

    return {
      errores: nuevos,
      body: {
        ...(!modoAutogenerado ? { codigo: codigo.trim() } : {}),
        descripcion: descripcion.trim(),
        unidad: unidad.trim(),
        ...(porcentaje !== undefined ? { porcentajeIndirecto: porcentaje } : {}),
        ...(capituloId ? { capituloId } : {}),
        detalles: detalles.map((detalle) => ({
          ...detalle,
          cantidad: detalle.cantidad!,
        })),
      },
    };
  };

  const enviar = async () => {
    if (enviandoRef.current) return;
    const resultado = validar();
    setErrores(resultado.errores);
    if (!resultado.body) {
      setResumenError("Corrija los campos indicados antes de crear el APU.");
      window.setTimeout(() => {
        if (resultado.primerCampo) document.getElementById(resultado.primerCampo)?.focus();
      }, 0);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);
    setResumenError("");
    try {
      const respuesta = await crear.mutateAsync(resultado.body);
      reiniciar();
      onCreado(respuesta);
    } catch (error) {
      setResumenError(errorDeMutacion(error));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void enviar();
      }}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="apu-manual-codigo">Código</Label>
          <Input
            id="apu-manual-codigo"
            value={codigo}
            maxLength={20}
            disabled={modoAutogenerado}
            placeholder={modoAutogenerado ? "Generado automáticamente" : "Ej: APU-005"}
            aria-invalid={!!errores.codigo}
            aria-describedby={errores.codigo ? "apu-manual-codigo-error" : undefined}
            onChange={(event) => {
              setCodigo(event.target.value);
              limpiarError("codigo");
            }}
          />
          {errores.codigo && (
            <p id="apu-manual-codigo-error" className="text-xs text-destructive">
              {errores.codigo}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="apu-manual-unidad">Unidad</Label>
          <Input
            id="apu-manual-unidad"
            value={unidad}
            maxLength={10}
            aria-invalid={!!errores.unidad}
            aria-describedby={errores.unidad ? "apu-manual-unidad-error" : undefined}
            onChange={(event) => {
              setUnidad(event.target.value);
              limpiarError("unidad");
            }}
          />
          {errores.unidad && (
            <p id="apu-manual-unidad-error" className="text-xs text-destructive">
              {errores.unidad}
            </p>
          )}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="apu-manual-descripcion">Descripción</Label>
          <Input
            id="apu-manual-descripcion"
            value={descripcion}
            maxLength={255}
            aria-invalid={!!errores.descripcion}
            aria-describedby={errores.descripcion ? "apu-manual-descripcion-error" : undefined}
            onChange={(event) => {
              setDescripcion(event.target.value);
              limpiarError("descripcion");
            }}
          />
          {errores.descripcion && (
            <p id="apu-manual-descripcion-error" className="text-xs text-destructive">
              {errores.descripcion}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="apu-manual-porcentaje">Porcentaje indirecto (%)</Label>
          <Input
            id="apu-manual-porcentaje"
            type="text"
            inputMode="decimal"
            value={porcentajeIndirecto}
            placeholder="Heredar del proyecto"
            aria-invalid={!!errores.porcentajeIndirecto}
            aria-describedby={
              errores.porcentajeIndirecto ? "apu-manual-porcentaje-error" : undefined
            }
            onChange={(event) => {
              setPorcentajeIndirecto(event.target.value);
              limpiarError("porcentajeIndirecto");
            }}
          />
          {errores.porcentajeIndirecto && (
            <p id="apu-manual-porcentaje-error" className="text-xs text-destructive">
              {errores.porcentajeIndirecto}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {SECCIONES.map((seccionTipo) => {
          const filas = borradores.filter((borrador) => borrador.seccionTipo === seccionTipo);
          const tituloId = `seccion-${seccionTipo}-titulo`;
          return (
            <section
              key={seccionTipo}
              aria-labelledby={tituloId}
              className="space-y-3 rounded-xl border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 id={tituloId} className="font-medium">
                  {seccionTipo}
                </h3>
                <Button
                  id={`agregar-insumo-${seccionTipo}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelector(seccionTipo)}
                >
                  Agregar insumo
                </Button>
              </div>
              {filas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin insumos</p>
              ) : (
                <div className="space-y-3">
                  {filas.map((borrador, indice) => {
                    const insumo = listaInsumos.find((item) => item.id === borrador.insumoId);
                    const cantidadError = errores[`detalle-${borrador.id}-cantidad`];
                    const rendimientoError = errores[`detalle-${borrador.id}-rendimiento`];
                    return (
                      <div
                        key={borrador.id}
                        className="grid gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-12"
                      >
                        <div className="sm:col-span-4">
                          <p className="font-medium">
                            {insumo
                              ? `${insumo.codigo} — ${insumo.descripcion}`
                              : `Insumo ${borrador.insumoId}`}
                          </p>
                          {insumo && (
                            <p className="text-xs text-muted-foreground">{insumo.unidad}</p>
                          )}
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor={`detalle-${borrador.id}-cantidad`}>Cantidad</Label>
                          <Input
                            id={`detalle-${borrador.id}-cantidad`}
                            aria-label={`Cantidad de ${seccionTipo} ${indice + 1}`}
                            inputMode="decimal"
                            value={borrador.cantidad}
                            aria-invalid={!!cantidadError}
                            aria-describedby={
                              cantidadError ? `detalle-${borrador.id}-cantidad-error` : undefined
                            }
                            onChange={(event) =>
                              actualizarBorrador(borrador.id, "cantidad", event.target.value)
                            }
                          />
                          {cantidadError && (
                            <p
                              id={`detalle-${borrador.id}-cantidad-error`}
                              className="text-xs text-destructive"
                            >
                              {cantidadError}
                            </p>
                          )}
                        </div>
                        {CON_RENDIMIENTO.has(seccionTipo) && (
                          <div className="space-y-1 sm:col-span-3">
                            <Label htmlFor={`detalle-${borrador.id}-rendimiento`}>
                              Rendimiento
                            </Label>
                            <Input
                              id={`detalle-${borrador.id}-rendimiento`}
                              aria-label={`Rendimiento de ${seccionTipo} ${indice + 1}`}
                              inputMode="decimal"
                              value={borrador.rendimiento}
                              aria-invalid={!!rendimientoError}
                              aria-describedby={
                                rendimientoError
                                  ? `detalle-${borrador.id}-rendimiento-error`
                                  : undefined
                              }
                              onChange={(event) =>
                                actualizarBorrador(borrador.id, "rendimiento", event.target.value)
                              }
                            />
                            {rendimientoError && (
                              <p
                                id={`detalle-${borrador.id}-rendimiento-error`}
                                className="text-xs text-destructive"
                              >
                                {rendimientoError}
                              </p>
                            )}
                          </div>
                        )}
                        <div className="flex items-end justify-end gap-1 sm:col-span-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Subir insumo ${indice + 1}`}
                            disabled={indice === 0}
                            onClick={() => moverBorrador(seccionTipo, indice, -1)}
                          >
                            <ArrowUpIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Bajar insumo ${indice + 1}`}
                            disabled={indice === filas.length - 1}
                            onClick={() => moverBorrador(seccionTipo, indice, 1)}
                          >
                            <ArrowDownIcon />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Eliminar insumo ${indice + 1}`}
                            onClick={() => eliminarBorrador(borrador.id)}
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {errores.detalles && <p className="text-sm text-destructive">{errores.detalles}</p>}
      {resumenError && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {resumenError}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" disabled={enviando} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando || parametros.isPending}>
          {enviando && <Spinner />}
          Crear APU
        </Button>
      </div>

      {selector && (
        <SelectorInsumo
          abierto
          proyectoId={proyectoId}
          tipo={selector}
          onClose={() => setSelector(null)}
          onSeleccionar={({ seccionTipo, insumoId }) => agregarBorrador(seccionTipo, insumoId)}
        />
      )}
    </form>
  );
}
