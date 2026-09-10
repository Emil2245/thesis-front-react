import { PanelEspecificacionTecnica } from "@/features/apu-editor/components/PanelEspecificacionTecnica";
import { useEspecificacionTecnica } from "@/features/apu-editor/hooks/useEspecificacionTecnica";
import { EstadoVacio } from "@/components/comunes/EstadoVacio";

/**
 * Workspace tab for the selected APU technical specification.
 * @param props.apuId Selected APU identifier, or null when no APU is selected.
 * WorkspacePage provides only this prop; HTTP, validation, caching, and
 * persistence remain in the reusable specification hook.
 */
export function PestanaEspecificacionTecnica({ apuId }: { apuId: string | null }) {
  const { query, mutation, guardar } = useEspecificacionTecnica(apuId);

  if (!apuId) {
    return (
      <EstadoVacio
        titulo="Selecciona un rubro"
        descripcion="Selecciona un rubro para consultar su especificación técnica."
      />
    );
  }

  if (query.isPending) return <output>Cargando especificación técnica…</output>;

  if (query.isError) {
    return (
      <div className="space-y-2 p-4">
        <p role="alert">No se pudo cargar la especificación técnica.</p>
        <button type="button" onClick={() => query.refetch()} className="underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!query.data) {
    return (
      <EstadoVacio
        titulo="Especificación técnica no disponible"
        descripcion="No se encontró información para este APU."
      />
    );
  }

  const { contenido } = query.data;
  const mutationBelongsToApu = mutation.variables?.apuId === apuId;
  const mutationErrorMessage =
    mutation.error instanceof Error && mutation.error.message
      ? mutation.error.message
      : "No se pudo guardar la especificación técnica. Inténtalo nuevamente.";

  return (
    <div
      className="space-y-3 p-4"
      aria-busy={mutationBelongsToApu && mutation.isPending ? true : undefined}
    >
      <output className="text-sm text-muted-foreground" aria-live="polite">
        {contenido === null
          ? "Este APU aún no tiene contenido de especificación técnica."
          : contenido === ""
            ? "La especificación técnica está vacía."
            : "Especificación técnica disponible para edición."}
      </output>
      {mutationBelongsToApu && mutation.isPending && (
        <output aria-live="polite">Guardando especificación técnica…</output>
      )}
      {mutationBelongsToApu && mutation.isError && <p role="alert">{mutationErrorMessage}</p>}
      {mutationBelongsToApu && mutation.isSuccess && (
        <output aria-live="polite">Especificación técnica guardada.</output>
      )}
      <PanelEspecificacionTecnica
        key={apuId}
        texto={contenido}
        onGuardar={async (texto) => {
          try {
            await guardar(texto);
          } catch {
            // The mutation error is rendered above and the panel keeps its local text.
          }
        }}
      />
    </div>
  );
}
