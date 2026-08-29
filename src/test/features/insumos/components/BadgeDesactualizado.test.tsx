import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { BadgeDesactualizado } from "@/features/insumos/components/BadgeDesactualizado";

describe("BadgeDesactualizado", () => {
  it("renders badge when true", () => {
    renderConProviders(<BadgeDesactualizado desactualizado={true} />);
    expect(screen.getByText("Desactualizado")).toBeInTheDocument();
  });

  it("returns null when false", () => {
    const { container } = renderConProviders(<BadgeDesactualizado desactualizado={false} />);
    expect(container.firstChild).toBeNull();
  });
});
