import { useState, useCallback } from "react";
import type { ApuResponse, ApuPatchRequest } from "@/api/contract";
import { Button } from "@/components/ui/button";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EditIcon, CheckIcon, XIcon } from "lucide-react";

interface EncabezadoApuProps {
  apu: ApuResponse;
  onEditar: (patch: ApuPatchRequest) => Promise<void>;
}

export function EncabezadoApu({ apu, onEditar }: EncabezadoApuProps) {
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState(apu.codigo);
  const [descripcion, setDescripcion] = useState(apu.descripcion);
  const [unidad, setUnidad] = useState(apu.unidad);

  const iniciar = useCallback(() => {
    setCodigo(apu.codigo);
    setDescripcion(apu.descripcion);
    setUnidad(apu.unidad);
    setEditando(true);
  }, [apu]);

  const guardar = useCallback(async () => {
    await onEditar({ codigo, descripcion, unidad });
    setEditando(false);
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
            <Input id="apu-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="apu-descripcion">Descripción</FieldLabel>
            <Input
              id="apu-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apu-unidad">Unidad</FieldLabel>
            <Input id="apu-unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={guardar}>
            <CheckIcon data-icon="inline-start" /> Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={cancelar}>
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
