import { useState, useCallback } from "react";
import { ApiError } from "@/api/problem";
import type { ApuResponse, ApuPatchRequest } from "@/api/contract";
import { BadgeAuxiliar } from "./BadgeAuxiliar";
import { Button } from "@/components/ui/button";
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
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Código</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Unidad</Label>
            <Input value={unidad} onChange={(e) => setUnidad(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={guardar}>
            <CheckIcon /> Guardar
          </Button>
          <Button size="sm" variant="outline" onClick={cancelar}>
            <XIcon /> Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{apu.codigo}</h2>
              <BadgeAuxiliar esAuxiliar={apu.esAuxiliar} />
            </div>
            <p className="text-sm text-muted-foreground">{apu.descripcion}</p>
            <p className="text-xs text-muted-foreground">Unidad: {apu.unidad}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={iniciar}>
            <EditIcon className="size-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Switch
            id="es-auxiliar"
            checked={apu.esAuxiliar}
            onCheckedChange={manejarToggleAuxiliar}
          />
          <Label htmlFor="es-auxiliar" className="text-xs">
            Rubro auxiliar
          </Label>
        </div>
      </div>

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
