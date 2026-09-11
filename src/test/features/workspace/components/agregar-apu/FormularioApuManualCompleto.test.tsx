import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import type { SeccionTipo } from "@/api/contract";
import { FormularioApuManualCompleto } from "@/features/workspace/components/agregar-apu/FormularioApuManualCompleto";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { parametrosFixture } from "@/test/fixtures/proyectos";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { presupuestoFixture } from "@/test/fixtures/presupuesto";

const API = "*/api/v1";
const PROYECTO = "01927f4e-1a2b-7c3d-8e4f-000000000001";
const PRESUPUESTO = "0198c1a0-0000-7000-8000-000000000011";
const CAPITULO = "0198c1a1-0000-7000-8000-000000000010";
const IDS: Record<SeccionTipo, string> = {
  EQUIPO: "018f8a20-0000-7000-8000-000000000015",
  MANO_OBRA: "018f8a20-0000-7000-8000-000000000013",
  MATERIAL: "018f8a20-0000-7000-8000-000000000010",
  TRANSPORTE: "018f8a20-0000-7000-8000-000000000017",
};
const MATERIAL_ALTERNATIVO = "018f8a20-0000-7000-8000-000000000011";

vi.mock("@/features/apu-editor/components/SelectorInsumo", () => ({
  SelectorInsumo: ({
    abierto,
    tipo,
    onSeleccionar,
  }: {
    abierto: boolean;
    tipo: SeccionTipo;
    onSeleccionar: (seleccion: { seccionTipo: SeccionTipo; insumoId: string }) => void;
  }) =>
    abierto ? (
      <div>
        <button
          type="button"
          onClick={() => onSeleccionar({ seccionTipo: tipo, insumoId: IDS[tipo] })}
        >
          Seleccionar {tipo}
        </button>
        {tipo === "MATERIAL" && (
          <button
            type="button"
            onClick={() => onSeleccionar({ seccionTipo: tipo, insumoId: MATERIAL_ALTERNATIVO })}
          >
            Seleccionar MATERIAL alternativo
          </button>
        )}
      </div>
    ) : null,
}));

function renderFormulario(
  overrides: Partial<React.ComponentProps<typeof FormularioApuManualCompleto>> = {},
) {
  const props: React.ComponentProps<typeof FormularioApuManualCompleto> = {
    presupuestoId: PRESUPUESTO,
    proyectoId: PROYECTO,
    onCreado: vi.fn(),
    onCancelar: vi.fn(),
    ...overrides,
  };
  return { props, ...renderConProviders(<FormularioApuManualCompleto {...props} />) };
}

async function agregar(user: ReturnType<typeof renderConProviders>["user"], seccion: string) {
  const region = screen.getByRole("region", { name: seccion });
  await user.click(within(region).getByRole("button", { name: "Agregar insumo" }));
  await user.click(screen.getByRole("button", { name: `Seleccionar ${seccion}` }));
}

describe("FormularioApuManualCompleto", () => {
  it("muestra las cuatro secciones vacías, omite el código autogenerado y cancela sin enviar", async () => {
    let posts = 0;
    server.use(
      http.post(`${API}/presupuestos/:id/apus/completo`, () => {
        posts += 1;
        return HttpResponse.json({ apu: apuDetalleFixture, presupuesto: presupuestoFixture });
      }),
    );
    const { user, props } = renderFormulario();

    for (const nombre of ["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]) {
      expect(screen.getByRole("region", { name: nombre })).toHaveTextContent("Sin insumos");
    }
    const codigo = await screen.findByLabelText("Código");
    await waitFor(() => expect(codigo).toBeDisabled());
    expect(codigo).toHaveAttribute("placeholder", "Generado automáticamente");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onCancelar).toHaveBeenCalledOnce();
    expect(posts).toBe(0);
  });

  it("en modo manual exige código y enfoca el primer campo inválido", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/parametros`, () =>
        HttpResponse.json({ ...parametrosFixture, modoCodigoRubro: "MANUAL" }),
      ),
    );
    const { user } = renderFormulario();

    await user.click(await screen.findByRole("button", { name: "Crear APU" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Corrija los campos indicados");
    expect(screen.getByText("El código es obligatorio")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Código")).toHaveFocus());
  });

  it("valida cantidades y rendimientos positivos en las secciones aplicables", async () => {
    const { user } = renderFormulario();
    await agregar(user, "EQUIPO");
    await agregar(user, "MATERIAL");
    await user.type(screen.getByLabelText("Descripción"), "Excavación manual");
    await user.type(screen.getByLabelText("Unidad"), "m3");
    await user.clear(screen.getByLabelText("Cantidad de EQUIPO 1"));
    await user.type(screen.getByLabelText("Cantidad de EQUIPO 1"), "0");

    await user.click(screen.getByRole("button", { name: "Crear APU" }));

    expect(screen.getByText("La cantidad debe ser mayor que cero")).toBeInTheDocument();
    expect(screen.getByText("El rendimiento debe ser mayor que cero")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rendimiento de MATERIAL 1")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Cantidad de EQUIPO 1")).toHaveFocus());

    const material = screen.getByRole("region", { name: "MATERIAL" });
    await user.click(within(material).getByRole("button", { name: "Eliminar insumo 1" }));
    expect(within(material).queryByLabelText("Cantidad de MATERIAL 1")).not.toBeInTheDocument();
    expect(material).toHaveTextContent("Sin insumos");
  });

  it("envía el body editable exacto, conserva el orden y omite rendimientos no aplicables", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/parametros`, () =>
        HttpResponse.json({ ...parametrosFixture, modoCodigoRubro: "MANUAL" }),
      ),
    );
    let body: unknown;
    server.use(
      http.post(`${API}/presupuestos/:id/apus/completo`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { apu: apuDetalleFixture, presupuesto: presupuestoFixture },
          { status: 201 },
        );
      }),
    );
    const onCreado = vi.fn();
    const { user } = renderFormulario({ capituloId: CAPITULO, onCreado });

    await user.type(await screen.findByLabelText("Código"), "MAN-001");
    await user.type(screen.getByLabelText("Descripción"), "Hormigón manual");
    await user.type(screen.getByLabelText("Unidad"), "m3");
    await user.type(screen.getByLabelText("Porcentaje indirecto (%)"), "15");
    await agregar(user, "EQUIPO");
    await agregar(user, "MANO_OBRA");
    await agregar(user, "MATERIAL");
    const material = screen.getByRole("region", { name: "MATERIAL" });
    await user.click(within(material).getByRole("button", { name: "Agregar insumo" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar MATERIAL alternativo" }));
    await agregar(user, "TRANSPORTE");
    await user.type(screen.getByLabelText("Rendimiento de EQUIPO 1"), "2");
    await user.type(screen.getByLabelText("Rendimiento de MANO_OBRA 1"), "4.5");
    await user.click(within(material).getByRole("button", { name: "Subir insumo 2" }));
    await user.click(screen.getByRole("button", { name: "Crear APU" }));

    await waitFor(() => expect(onCreado).toHaveBeenCalledOnce());
    expect(body).toEqual({
      codigo: "MAN-001",
      descripcion: "Hormigón manual",
      unidad: "m3",
      porcentajeIndirecto: 0.15,
      capituloId: CAPITULO,
      detalles: [
        {
          seccionTipo: "EQUIPO",
          insumoId: IDS.EQUIPO,
          cantidad: "1.000000",
          rendimiento: "2.000000",
        },
        {
          seccionTipo: "MANO_OBRA",
          insumoId: IDS.MANO_OBRA,
          cantidad: "1.000000",
          rendimiento: "4.500000",
        },
        { seccionTipo: "MATERIAL", insumoId: MATERIAL_ALTERNATIVO, cantidad: "1.000000" },
        { seccionTipo: "MATERIAL", insumoId: IDS.MATERIAL, cantidad: "1.000000" },
        { seccionTipo: "TRANSPORTE", insumoId: IDS.TRANSPORTE, cantidad: "1.000000" },
      ],
    });
    expect(onCreado).toHaveBeenCalledWith({
      apu: apuDetalleFixture,
      presupuesto: presupuestoFixture,
    });
    expect(screen.getByLabelText("Descripción")).toHaveValue("");
    expect(screen.getByRole("region", { name: "MATERIAL" })).toHaveTextContent("Sin insumos");
  });

  it("omite el código automático, bloquea doble submit y conserva borradores ante error", async () => {
    let posts = 0;
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(`${API}/presupuestos/:id/apus/completo`, async ({ request }) => {
        posts += 1;
        body = (await request.json()) as Record<string, unknown>;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return HttpResponse.json(
          { codigo: "validacion", mensaje: "No se pudo crear" },
          { status: 400 },
        );
      }),
    );
    const { user } = renderFormulario();
    await user.type(screen.getByLabelText("Descripción"), "Borrador importante");
    await user.type(screen.getByLabelText("Unidad"), "u");
    await agregar(user, "MATERIAL");
    const crear = screen.getByRole("button", { name: "Crear APU" });

    await Promise.all([user.click(crear), user.click(crear)]);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No se pudo crear"));
    expect(posts).toBe(1);
    expect(body).not.toHaveProperty("codigo");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Borrador importante");
    expect(screen.getByLabelText("Cantidad de MATERIAL 1")).toHaveValue("1.000000");
  });
});
