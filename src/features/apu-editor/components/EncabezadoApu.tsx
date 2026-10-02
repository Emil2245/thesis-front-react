import { useState, useCallback, useEffect } from "react";
import type { ApuResponse, ApuPatchRequest } from "@/api/contract";
import { Button } from "@/components/ui/button";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EditIcon, CheckIcon, XIcon } from "lucide-react";

interface EncabezadoApuProps {
  apu: ApuResponse;
  onBorradorChange?: (borrador: boolean) => void;
  onEditar: (patch: ApuPatchRequest) => Promise<void>;
}

export function EncabezadoApu({ apu, onEditar, onBorradorChange }: EncabezadoApuProps) {
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState(apu.codigo);
  const [descripcion, setDescripcion] = useState(apu.descripcion);
  const [unidad, setUnidad] = useState(apu.unidad);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    onBorradorChange?.(
      editando &&
        (codigo !== apu.codigo || descripcion !== apu.descripcion || unidad !== apu.unidad),
    );
  }, [onBorradorChange, editando, codigo, descripcion, unidad, apu]);

  const iniciar = useCallback(() => {
    setCodigo(apu.codigo);
    setDescripcion(apu.descripcion);
    setUnidad(apu.unidad);
    setEditando(true);
  }, [apu]);

  const guardar = useCallback(async () => {
    setGuardando(true);
    setError(false);
    try {
      await onEditar({ codigo, descripcion, unidad });
      setEditando(false);
    } catch {
      setError(true);
    } finally {
      setGuardando(false);
    }
  }, [codigo, descripcion, unidad, onEditar]);

  const cancelar = useCallback(() => {
    setEditando(false);
  }, []);

  if (editando) {
    return (
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="apu-codigo">Código</FieldLabel>
            <Input
              disabled={guardando}
              id="apu-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apu-descripcion">Descripción</FieldLabel>
            <Input
              disabled={guardando}
              id="apu-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apu-unidad">Unidad</FieldLabel>
            <Input
              disabled={guardando}
              id="apu-unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
            />
          </Field>
        </FieldGroup>
        {error && <p role="alert">No se pudo guardar el encabezado</p>}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={guardar} disabled={guardando}>
            <CheckIcon data-icon="inline-start" /> Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={cancelar} disabled={guardando}>
            <XIcon data-icon="inline-start" /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <EncabezadoPagina
      titulo={
        <>
          <span className="mr-2 font-mono text-sm font-normal text-muted-foreground">
            {apu.codigo}
          </span>
          {apu.descripcion}
        </>
      }
      meta={
        <span>
          Unidad <span className="font-medium text-foreground">{apu.unidad}</span>
        </span>
      }
      acciones={
        <Button variant="outline" onClick={iniciar}>
          <EditIcon data-icon="inline-start" /> Editar encabezado
        </Button>
      }
    />
  );
}
