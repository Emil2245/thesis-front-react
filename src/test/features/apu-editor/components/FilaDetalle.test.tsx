import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, screen } from "@testing-library/react";
import { FilaDetalle } from "@/features/apu-editor/components/FilaDetalle";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { renderConProviders } from "@/test/render";

const detalles = apuDetalleFixture.secciones.find(
  (seccion) => seccion.tipo === "MANO_OBRA",
)!.detalles;

function renderFilas(onReordenarFila = vi.fn(async () => {})) {
  return renderConProviders(
    <table>
      <tbody>
        {detalles.map((detalle, indice) => (
          <FilaDetalle
            key={detalle.id}
            fila={{
              detalle,
              protegida: false,
              heredado: detalle.precioHeredado,
              estado: "estable",
              mensajesValidacion: {},
            }}
            muestraRendimiento
            onEditarCelda={vi.fn(async () => {})}
            onRestaurarHerencia={vi.fn(async () => {})}
            onEliminarFila={vi.fn(async () => {})}
            onReordenarFila={onReordenarFila}
            seccionTipo="MANO_OBRA"
            indice={indice}
            totalFilas={detalles.length}
          />
        ))}
      </tbody>
    </table>,
  );
}

describe("FilaDetalle", () => {
  it("muestra el menú contextual con los atajos de orden y respeta los límites", async () => {
    const onReordenarFila = vi.fn(async () => {});
    const { user } = renderFilas(onReordenarFila);
    const primera = screen.getByRole("row", { name: /Albañil/ });

    fireEvent.contextMenu(primera);

    expect(await screen.findByRole("menuitem", { name: /Subir fila/ })).toHaveAttribute(
      "data-disabled",
    );
    await user.click(screen.getByRole("menuitem", { name: /Bajar fila/ }));
    expect(onReordenarFila).toHaveBeenCalledWith(detalles[0].id, 2);
  });

  it("mueve una fila al soltarla sobre otra usando el handle", () => {
    const onReordenarFila = vi.fn(async () => {});
    renderFilas(onReordenarFila);
    const primera = screen.getByRole("row", { name: /Albañil/ });
    const segunda = screen.getByRole("row", { name: /Peón/ });
    const handle = screen.getByRole("button", { name: "Arrastrar Albañil" });
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      types: ["text/plain"],
      setData: vi.fn(),
      getData: vi.fn(() =>
        JSON.stringify({ detalleId: detalles[0].id, seccionTipo: "MANO_OBRA", indice: 0 }),
      ),
    };

    fireEvent.dragStart(handle, { dataTransfer });
    const drop = createEvent.drop(segunda, { dataTransfer });
    Object.defineProperty(drop, "clientY", { value: 20 });
    fireEvent(segunda, drop);

    expect(primera).toBeInTheDocument();
    expect(dataTransfer.setData).toHaveBeenCalled();
    expect(dataTransfer.getData).toHaveBeenCalled();
    expect(onReordenarFila).toHaveBeenCalledWith(detalles[0].id, 2);
  });
});
