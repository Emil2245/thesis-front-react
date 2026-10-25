import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsistenteImportCsv } from "@/features/insumos/components/AsistenteImportCsv";
import { useImportarCsv } from "@/features/insumos/hooks/useImportCsv";
import { destinoProyecto } from "@/features/insumos/destino";
import { importResultadoFixture, importResultadoConErroresFixture } from "@/test/fixtures/insumos";

vi.mock("@/features/insumos/hooks/useImportCsv", () => ({ useImportarCsv: vi.fn() }));

const csvContent =
  "codigo,tipo,descripcion,unidad,precio\nM-9,MATERIAL,Pintura,gl,10.5\nMO-1,mo,Peón,,3.2\nEQ-1,EQUIPO,Grúa,h,9\nTR-1,TRANSPORTE,Volqueta,m3,1";

const subirArchivo = async (input: HTMLElement) => {
  const archivo = new File([csvContent], "insumos.csv", { type: "text/csv" });
  const user = userEvent.setup();
  await user.upload(input, archivo);
};

describe("AsistenteImportCsv", () => {
  beforeEach(() => {
    vi.mocked(useImportarCsv).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(importResultadoFixture),
      isPending: false,
    } as never);
  });

  // Plan 067: el texto anterior nombraba `tipo` y `precioUnitario`, columnas
  // que el parser del backend no acepta — quien lo siguiera no importaba nada.
  it("nombra las columnas del parser incluida tipo, no precioUnitario", async () => {
    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={() => {}}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/codigo, descripcion, precio, tipo y unidad/i)).toBeInTheDocument();
    expect(screen.queryByText(/precioUnitario/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Paso 1 de 2/)).toBeInTheDocument();
  });

  // El enlace "Descargar plantilla" apuntaba al vacío: `/plantillas` es además
  // una ruta del SPA, así que el usuario se descargaba el HTML de la app.
  it("la plantilla descargable existe con la cabecera del parser", () => {
    const csv = readFileSync("public/plantillas/insumos-template.csv", "utf8");
    expect(csv.split("\n")[0]).toBe("codigo,tipo,descripcion,unidad,precio");
    for (const tipo of ["MATERIAL", "MANO_OBRA", "EQUIPO", "TRANSPORTE"]) {
      expect(csv).toContain(`,${tipo},`);
    }
  });

  it("la vista previa muestra el tipo detectado por fila", async () => {
    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={() => {}}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );
    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    const tabla = await screen.findByRole("table", { name: "Vista previa" });
    expect(tabla).toHaveTextContent("Mano de obra");
    expect(tabla).toHaveTextContent("Equipo");
    expect(tabla).toHaveTextContent("Transporte");
    expect(tabla).toHaveTextContent("Material");
  });

  it("el resultado muestra creados, actualizados, sin cambios y errores", async () => {
    vi.mocked(useImportarCsv).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(importResultadoConErroresFixture),
      isPending: false,
    } as never);
    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={() => {}}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );
    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(await screen.findByText(/0 sin cambios/)).toBeInTheDocument();
  });

  it("happy path: imports and closes", async () => {
    const onClose = vi.fn();
    const mutateAsync = vi.fn().mockResolvedValue(importResultadoFixture);
    vi.mocked(useImportarCsv).mockReturnValue({ mutateAsync, isPending: false } as never);

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await waitFor(() => {
      expect(screen.getByText(/filas detectadas/i)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(mutateAsync).toHaveBeenCalledOnce();
    const [{ formData }] = mutateAsync.mock.calls[0] as [{ formData: FormData }];
    expect(formData.get("archivo")).toBeInstanceOf(File);
  });

  it("shows per-row errors in final step and stays open", async () => {
    const onClose = vi.fn();
    vi.mocked(useImportarCsv).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(importResultadoConErroresFixture),
      isPending: false,
    } as never);

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(screen.getByText(/Fila 3/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Fila 7/i)).toBeInTheDocument();
    expect(screen.getByText(/Paso 2 de 2/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("csv-invalido keeps the wizard open", async () => {
    const onClose = vi.fn();
    vi.mocked(useImportarCsv).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error("El archivo CSV no es válido")),
      isPending: false,
    } as never);

    renderConProviders(
      <AsistenteImportCsv
        abierto={true}
        onClose={onClose}
        destino={destinoProyecto("01927f4e-1a2b-7c3d-8e4f-000000000001")}
      />,
    );

    await subirArchivo(screen.getByLabelText(/Archivo CSV/i));
    await userEvent.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      expect(screen.getByText(/Seleccionar archivo/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
