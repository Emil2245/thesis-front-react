import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { WorkspaceSplit } from "@/features/workspace/components/WorkspaceSplit";
import { renderConProviders } from "@/test/render";

describe("WorkspaceSplit", () => {
  it("renders labelled, keyboard-navigable regions and a 50% divider", async () => {
    const { user } = renderConProviders(
      <WorkspaceSplit left={<p>Árbol</p>} right={<p>Detalle</p>} />,
    );
    const left = screen.getByRole("region", { name: "Presupuesto" });
    const divider = screen.getByRole("separator", { name: "Separador del workspace" });
    const right = screen.getByRole("region", { name: "Detalle del proyecto" });

    expect(left).toHaveAttribute("tabindex", "0");
    expect(right).toHaveAttribute("tabindex", "0");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(divider.parentElement).toHaveStyle(
      "grid-template-columns: minmax(0, 50fr) auto minmax(0, 50fr)",
    );
    expect(divider.parentElement).toHaveClass("flex-col", "md:grid", "gap-4", "md:gap-0");
    expect(left).toHaveClass("overflow-auto");
    expect(right).toHaveClass("overflow-auto");
    expect(divider).toHaveClass("md:col-start-2");
    expect(left).toHaveClass("md:col-start-1");
    expect(right).toHaveClass("md:col-start-3");

    await user.tab();
    expect(left).toHaveFocus();
    await user.tab();
    expect(divider).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(divider).toHaveAttribute("aria-valuenow", "51");
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(divider).toHaveAttribute("aria-valuenow", "56");
    await user.keyboard("{Home}");
    expect(divider).toHaveAttribute("aria-valuenow", "40");
    await user.keyboard("{End}");
    expect(divider).toHaveAttribute("aria-valuenow", "60");
    await user.tab();
    expect(right).toHaveFocus();
  });
});
