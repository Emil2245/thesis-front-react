import { useParams } from "react-router-dom";
import { useProyectoActivoId, useVersionActiva } from "@/shell/contexto";
import { EditorApu } from "../components/EditorApu";

export function EditorApuPage() {
  const { apuId = "" } = useParams<{ apuId: string }>();
  const proyectoId = useProyectoActivoId() ?? "";
  const { presupuestoId } = useVersionActiva();
  return (
    <EditorApu apuId={apuId} proyectoId={proyectoId} presupuestoId={presupuestoId ?? undefined} />
  );
}
