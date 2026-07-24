import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { AsistenteCrearProyecto } from "./AsistenteCrearProyecto";

describe("AsistenteCrearProyecto", () => {
  it("abre el asistente", () => {
    renderConProviders(<AsistenteCrearProyecto abierto onClose={() => {}} />);
    expect(screen.getByText(/crear proyecto/i)).toBeInTheDocument();
    expect(screen.getByText(/paso 1/i)).toBeInTheDocument();
  });
});
