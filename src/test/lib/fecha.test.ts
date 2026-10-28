import { describe, expect, it } from "vitest";
import { formatearFechaLarga } from "@/lib/fecha";

describe("formatearFechaLarga", () => {
  it("muestra el día elegido en UTC−5 (sin retroceder un día)", () => {
    const previo = process.env.TZ;
    process.env.TZ = "America/Guayaquil";
    try {
      expect(formatearFechaLarga("2026-03-01")).toBe("1 de marzo de 2026");
      expect(formatearFechaLarga("2026-01-15")).toBe("15 de enero de 2026");
    } finally {
      if (previo === undefined) delete process.env.TZ;
      else process.env.TZ = previo;
    }
  });
});
