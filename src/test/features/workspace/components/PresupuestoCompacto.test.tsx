import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { useSearchParams } from "react-router-dom";
import { PresupuestoCompacto } from "@/features/workspace/components/PresupuestoCompacto";
import { presupuestoFixture, RUBRO_1_1_1, RUBRO_1_2_1 } from "@/test/fixtures/presupuesto";
import { renderConProviders } from "@/test/render";

function SearchParamsProbe() {
  const [params] = useSearchParams();
  return <output data-testid="search-params">{params.toString()}</output>;
}

async function expandPath(user: ReturnType<typeof renderConProviders>["user"]) {
  await user.click(screen.getByRole("button", { name: "Expandir Preliminares" }));
  await user.click(screen.getByRole("button", { name: "Expandir Instalación de campamento" }));
}

describe("PresupuestoCompacto", () => {
  it("starts collapsed, then renders the six headers and literal Decimal values", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
    await expandPath(user);
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
    expect(screen.getByText("50.000000")).toBeInTheDocument();
    expect(screen.getByText("40.000000")).toBeInTheDocument();
    expect(screen.getByText("2000.000000")).toBeInTheDocument();
  });

  it("hides and reveals descendants on chapter expansion", async () => {
    const { user } = renderConProviders(<PresupuestoCompacto presupuesto={presupuestoFixture} />);
    await user.click(screen.getByRole("button", { name: "Expandir Preliminares" }));
    expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expandir Instalación de campamento" }));
    expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Contraer Instalación de campamento" }));
    expect(screen.queryByText("Excavación a máquina")).not.toBeInTheDocument();
  });

  it("selects by keyboard and click while preserving v and aria-selected", async () => {
    const { user } = renderConProviders(
      <>
        <PresupuestoCompacto presupuesto={presupuestoFixture} />
        <SearchParamsProbe />
      </>,
      { ruta: "/proyectos/presupuesto?v=3" },
    );
    await expandPath(user);
    const row = screen.getByText("Excavación a máquina").closest("tr")!;
    row.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("search-params")).toHaveTextContent(`v=3&rubro=${RUBRO_1_1_1}`);
    expect(screen.getAllByRole("row", { selected: true })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Expandir Cerramiento provisional" }));
    await user.click(screen.getByText("Transporte material"));
    expect(screen.getByTestId("search-params")).toHaveTextContent(`v=3&rubro=${RUBRO_1_2_1}`);
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

  it("has no CRUD controls", () => {
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
});
