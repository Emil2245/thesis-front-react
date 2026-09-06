import { http as mswHttp, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/server";
import { descargar } from "@/api/request";

// Plan 051 §«descargar() hace imposible leer Content-Disposition»: devolvía solo
// `.data`, así que el nombre real del archivo —el que pone el backend en la
// cabecera— era inalcanzable y todo llamante tenía que inventárselo.
const conCabecera = (cd?: string) =>
  server.use(
    mswHttp.get("*/api/v1/descarga", () =>
      HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        headers: {
          "Content-Type": "application/octet-stream",
          ...(cd && { "Content-Disposition": cd }),
        },
      }),
    ),
  );

describe("descargar", () => {
  it("devuelve el blob junto al filename de Content-Disposition", async () => {
    conCabecera('attachment; filename="ET-Proyecto Norte.docx"');

    const { blob, nombreArchivo } = await descargar("/descarga");

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(8);
    expect(nombreArchivo).toBe("ET-Proyecto Norte.docx");
  });

  it("entiende el filename* codificado de RFC 5987", async () => {
    conCabecera("attachment; filename*=UTF-8''ET-Ampliaci%C3%B3n.docx");

    expect((await descargar("/descarga")).nombreArchivo).toBe("ET-Ampliación.docx");
  });

  it("sin cabecera deja el nombre indefinido para que decida el llamante", async () => {
    conCabecera();

    expect((await descargar("/descarga")).nombreArchivo).toBeUndefined();
  });

  it("se queda con el nombre base: la cabecera no elige dónde escribir", async () => {
    conCabecera('attachment; filename="../../../etc/passwd"');

    expect((await descargar("/descarga")).nombreArchivo).toBe("passwd");
  });
});
