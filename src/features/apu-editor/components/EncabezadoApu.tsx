import { useState, useCallback } from "react";
import { ApiError } from "@/api/problem";
import type { ApuResponse, ApuPatchRequest } from "@/api/contract";
import { BadgeAuxiliar } from "./BadgeAuxiliar";
import { Button } from "@/components/ui/button";
import { EncabezadoPagina, PuntoMeta } from "@/components/comunes/EncabezadoPagina";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditIcon, CheckIcon, XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EncabezadoApuProps {
  apu: ApuResponse;
  onEditar: (patch: ApuPatchRequest) => Promise<void>;
  onAlternarAuxiliar?: (esAuxiliar: boolean) => Promise<void>;
}

export function EncabezadoApu({ apu, onEditar, onAlternarAuxiliar }: EncabezadoApuProps) {
  const [editando, setEditando] = useState(false);
  const [codigo, setCodigo] = useState(apu.codigo);
  const [descripcion, setDescripcion] = useState(apu.descripcion);
  const [unidad, setUnidad] = useState(apu.unidad);
  const [conflictoAbierto, setConflictoAbierto] = useState(false);
  const [usos, setUsos] = useState<string[]>([]);

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

  const manejarToggleAuxiliar = useCallback(async () => {
    if (!onAlternarAuxiliar) return;
    try {
      await onAlternarAuxiliar(!apu.esAuxiliar);
    } catch (e) {
      if (e instanceof ApiError && e.is("flag-auxiliar-bloqueado")) {
        const usosList = (e.problem.usos as Array<{ codigo: string; descripcion: string }>) ?? [];
        setUsos(usosList.map((u) => `${u.codigo} — ${u.descripcion}`));
        setConflictoAbierto(true);
      }
    }
  }, [apu.esAuxiliar, onAlternarAuxiliar]);

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
    <>
      <EncabezadoPagina
        titulo={
          <>
            <span className="mr-2 font-mono text-sm font-normal text-muted-foreground">
              {apu.codigo}
            </span>
            {apu.descripcion}
          </>
        }
        insignia={<BadgeAuxiliar esAuxiliar={apu.esAuxiliar} />}
        meta={
          <>
            <span>
              Unidad <span className="font-medium text-foreground">{apu.unidad}</span>
            </span>
            <PuntoMeta />
            <span className="flex items-center gap-2">
              <Switch
                id="es-auxiliar"
                checked={apu.esAuxiliar}
                onCheckedChange={manejarToggleAuxiliar}
              />
              <Label htmlFor="es-auxiliar" className="text-sm font-normal text-muted-foreground">
                Rubro auxiliar
              </Label>
            </span>
          </>
        }
        acciones={
          <Button variant="outline" onClick={iniciar}>
            <EditIcon data-icon="inline-start" /> Editar encabezado
          </Button>
        }
      />

      <AlertDialog open={conflictoAbierto} onOpenChange={setConflictoAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rubro auxiliar en uso</AlertDialogTitle>
            <AlertDialogDescription>
              No se puede desmarcar como auxiliar porque está siendo usado en otros APUs:
            </AlertDialogDescription>
          </AlertDialogHeader>
          {usos.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {usos.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setConflictoAbierto(false)}>
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
