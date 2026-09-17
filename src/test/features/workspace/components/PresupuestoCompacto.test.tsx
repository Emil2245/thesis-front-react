import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "react-router-dom";
import { PresupuestoCompacto } from "@/features/workspace/components/PresupuestoCompacto";
import { usePresupuesto } from "@/features/presupuesto/hooks/usePresupuesto";
import {
  CAPITULO_1_1,
  CAPITULO_2,
  CAPITULO_DOCE,
  PRESUPUESTO_V2,
  presupuestoDoceSubcapitulosFixture,
  presupuestoFixture,
  RUBRO_1_1_1,
  RUBRO_1_2_1,
  subcapituloDoce,
} from "@/test/fixtures/presupuesto";
import { espiar, ultima } from "@/test/espia";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

const API = "*/api/v1";

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <output data-testid="search-params">{params.toString()}</output>;
}

describe("PresupuestoCompacto", () => {
  it("expands chapters and subchapters by default", () => {
    renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);

    expect(screen.getByRole("button", { name: "Contraer Preliminares" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Contraer Instalación de campamento" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
  });

  it("hides and reveals descendants on chapter expansion", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);

    await user.click(screen.getByRole("button", { name: "Contraer Instalación de campamento" }));
    expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expandir Instalación de campamento" }));
    expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
  });

  it("permite colapsar el capítulo que contiene el rubro seleccionado", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />, {
      ruta: `/proyectos/presupuesto?rubro=${RUBRO_1_1_1}`,
    });

    expect(screen.getByRole("row", { selected: true })).toHaveTextContent("Excavación a máquina");
    await user.click(screen.getByRole("button", { name: "Contraer Instalación de campamento" }));

    expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expandir Instalación de campamento" }),
    ).toBeInTheDocument();
  });

  it("renders formatted quantities, prices, subtotals, total and chapter hierarchy", () => {
    renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);

    const headers = screen.getByRole("table").querySelectorAll("thead th");
    expect(headers).toHaveLength(6);
    expect(Array.from(headers, (header) => header.textContent)).toEqual([
      "Ítem",
      "Descripción",
      "Und.",
      "Cantidad",
      "P.U.",
      "Parcial",
    ]);
    expect(screen.getByRole("textbox", { name: "Cantidad de Excavación a máquina" })).toHaveValue(
      "50.00",
    );
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getAllByText("$2,000.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("row", { name: /\$4,500.00/ })).toBeInTheDocument();
    expect(screen.queryByText(/^Subtotal/)).not.toBeInTheDocument();
    expect(screen.getByText("Costo total")).toBeInTheDocument();
    expect(screen.getByText("$18,500.00")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /1 · Preliminares/ })).toHaveClass("bg-muted");
    expect(screen.getByRole("row", { name: /1.1 · Instalación de campamento/ })).toHaveClass(
      "bg-muted/40",
    );
    expect(screen.getByRole("table").parentElement).toHaveClass("flex-1", "overflow-y-auto");
    expect(screen.getByText("Costo total").parentElement?.parentElement).toBe(
      screen.getByRole("table").parentElement?.parentElement,
    );
    expect(screen.getByText("Costo total").parentElement).toHaveClass("shrink-0");
    expect(screen.getByRole("table")).toHaveClass("text-sm");
    expect(screen.getByRole("table").querySelector("td")?.className).toContain("py-1");
    expect(screen.getByRole("textbox", { name: "Cantidad de Excavación a máquina" })).toHaveClass(
      "h-6",
      "min-w-0",
      "text-sm",
    );
  });

  it("filters branches client-side and reports empty results", () => {
    const { rerender } = renderConProviders(
      <PresupuestoCompacto presupuesto={presupuestoFixture} busqueda="Excavación" />,
    );

    expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
    expect(screen.queryByText("Hormigón simple")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contraer Preliminares" })).toBeInTheDocument();

    rerender(<PresupuestoCompacto presupuesto={presupuestoFixture} busqueda="inexistente" />);
    expect(screen.getByRole("status")).toHaveTextContent("No se encontraron rubros");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("selects by keyboard and click while preserving v and aria-selected", async () => {
    const { user } = renderConProviders(
      <>
        <PresupuestoCompacto presupuesto={presupuestoFixture} />
        <SearchParamsProbe />
      </>,
      { ruta: "/proyectos/presupuesto?v=3" },
    );

    const row = screen.getByText("Excavación a máquina").closest("tr")!;
    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("search-params")).toHaveTextContent(`v=3&rubro=${RUBRO_1_1_1}`);
    expect(screen.getAllByRole("row", { selected: true })).toHaveLength(1);

    await user.click(screen.getByText("Transporte material"));
    expect(screen.getByTestId("search-params")).toHaveTextContent(`v=3&rubro=${RUBRO_1_2_1}`);
  });

  it("actualiza la cantidad directamente desde el workspace", async () => {
    const peticiones = espiar();
    server.use(
      http.patch(
        `${API}/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/rubros/${RUBRO_1_1_1}`,
        async ({ request }) => {
          expect(await request.json()).toEqual({ cantidad: "420.50" });
          return HttpResponse.json(presupuestoFixture);
        },
      ),
    );
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);

    const input = screen.getByRole("textbox", { name: "Cantidad de Excavación a máquina" });
    await user.clear(input);
    await user.type(input, "420.50");
    await user.tab();

    await waitFor(() => {
      expect(
        ultima(
          peticiones,
          "PATCH",
          `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/rubros/${RUBRO_1_1_1}`,
        )?.cuerpo,
      ).toEqual({ cantidad: "420.50" });
    });
  });

  it("ofrece mover capítulos con restricciones y confirma la eliminación", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    const fila = screen.getByRole("row", { name: /1 · Preliminares/ });

    fireEvent.contextMenu(fila);
    expect(
      await screen.findByRole("menuitem", { name: "Agregar subcapítulo" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Ordenar capítulo" })).not.toBeInTheDocument();
    const mover = screen.getByRole("menuitem", { name: "Mover" });
    await user.hover(mover);
    expect(await screen.findByRole("menuitem", { name: /Mover arriba/ })).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByRole("menuitem", { name: /Mover abajo/ })).not.toHaveAttribute(
      "data-disabled",
    );
    await user.click(screen.getByRole("menuitem", { name: "Eliminar capítulo completo" }));

    const confirmacion = await screen.findByRole("alertdialog");
    expect(confirmacion).toHaveTextContent(/todo su contenido/i);
    expect(confirmacion).toHaveTextContent(/no se puede deshacer/i);
  });

  it("manda el atajo de mover arriba al endpoint de capítulos", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    const fila = screen.getByRole("row", { name: /2 · Obra civil/ });

    fireEvent.contextMenu(fila);
    await user.hover(await screen.findByRole("menuitem", { name: "Mover" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Mover arriba/ }));

    await waitFor(() => {
      expect(
        ultima(peticiones, "PATCH", `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_2}/mover`)
          ?.cuerpo,
      ).toEqual({ parentId: null, orden: 1 });
    });
  });

  it("ofrece un menú contextual para las filas de APU y confirma su retiro", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    const fila = screen.getByRole("row", { name: /1\.1\.1 Excavación a máquina/ });

    fireEvent.contextMenu(fila);
    expect(
      await screen.findByRole("menuitem", { name: "Ver detalle del APU" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Eliminar APU del presupuesto" }));

    const confirmacion = await screen.findByRole("alertdialog");
    expect(confirmacion).toHaveTextContent(/seguirá disponible en el catálogo/i);
    expect(confirmacion).toHaveTextContent(/no se puede deshacer/i);
  });

  it("preserves a stale rubro without silently selecting another entry", () => {
    renderConProviders(
      <>
        <PresupuestoCompacto presupuesto={presupuestoFixture} />
        <SearchParamsProbe />
      </>,
      { ruta: "/proyectos/presupuesto?v=3&rubro=stale" },
    );

    expect(screen.getByTestId("search-params")).toHaveTextContent("v=3&rubro=stale");
    expect(screen.queryAllByRole("row", { selected: true })).toHaveLength(0);
  });

  it("has no per-row CRUD controls", () => {
    renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    expect(
      screen
        .queryAllByRole("button")
        .filter((button) =>
          /^(Eliminar|Borrar|Agregar|Crear)/i.test(button.getAttribute("aria-label") ?? ""),
        ),
    ).toHaveLength(0);
  });

  it("shows an empty status output", () => {
    renderConProviders(
      <PresupuestoCompacto presupuesto={{ ...presupuestoFixture, capitulos: [] }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Este presupuesto no contiene rubros.");
  });

  it("ordena doce subcapítulos y manda a mover la posición natural, no la lexicográfica", async () => {
    // El backend ordena por `item` como cadena, así que con diez o más hermanos
    // el array llega barajado y `index + 1` deja de coincidir con `orden`. Con
    // doce subcapítulos "1.2" cae en el índice 4 del array lexicográfico y
    // "Mover abajo" mandaba 6 en vez de 3.
    const peticiones = espiar();
    server.use(
      http.get(`${API}/presupuestos/${PRESUPUESTO_V2}`, () =>
        HttpResponse.json(presupuestoDoceSubcapitulosFixture),
      ),
    );
    function CompactoDesdeLaQuery() {
      const { data } = usePresupuesto(PRESUPUESTO_V2);
      return data ? <PresupuestoCompacto presupuesto={data} /> : null;
    }
    const { user } = renderConProviders(<CompactoDesdeLaQuery />);

    await screen.findByRole("row", { name: /1\.12 · Tramo 12/ });
    const items = screen
      .getAllByRole("row")
      .map((fila) => /(\d+\.\d+) · /.exec(fila.textContent ?? "")?.[1])
      .filter((item): item is string => item !== undefined);
    expect(items).toEqual([
      "1.1",
      "1.2",
      "1.3",
      "1.4",
      "1.5",
      "1.6",
      "1.7",
      "1.8",
      "1.9",
      "1.10",
      "1.11",
      "1.12",
    ]);

    fireEvent.contextMenu(screen.getByRole("row", { name: /1\.2 · Tramo 2/ }));
    await user.hover(await screen.findByRole("menuitem", { name: "Mover" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Mover abajo/ }));

    await waitFor(() => {
      expect(
        ultima(
          peticiones,
          "PATCH",
          `/presupuestos/${PRESUPUESTO_V2}/capitulos/${subcapituloDoce(2)}/mover`,
        )?.cuerpo,
      ).toEqual({ parentId: CAPITULO_DOCE, orden: 3 });
    });
  });
});
