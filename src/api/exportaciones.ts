import { z } from "zod";
import { DocumentoPreflightError, http } from "./client";
import { documentoPreflightSchema, errorDeRespuesta, errorPayloadSchema } from "./schemas";
import { ApiError, problemDesconocido } from "./problem";
import { API_BASE_URL } from "@/lib/env";

const uuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticketPath = /^\/api\/v1\/documentos\/descargas\/[A-Za-z0-9_-]{43}$/;
const detalle = z
  .object({
    codigo: z.string(),
    mensaje: z.string(),
    rubros: z.array(
      z
        .object({
          id: z.uuid(),
          item: z.string(),
          codigo: z.string(),
          descripcion: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export const exportacionResponseSchema = z
  .object({
    operationId: z.uuid().regex(uuidV7),
    downloadUrl: z.string().regex(ticketPath),
    expiresAt: z.iso.datetime({ offset: true }),
    objectExpiresAt: z.iso.datetime({ offset: true }),
    filename: z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
    mediaType: z.enum([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(64 * 1024 * 1024),
    sha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
    warnings: z.array(detalle),
  })
  .strict();

const warningCronograma = z.object({ codigo: z.string(), detalle: z.string() }).strict();
const cronogramaResponseSchema = exportacionResponseSchema.extend({
  mediaType: z.enum([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/xml",
  ]),
  warnings: z.array(warningCronograma),
});
const bloqueoCronogramaSchema = z
  .object({
    presupuestoId: z.string().regex(uuidV7),
    formato: z.enum(["xlsx", "pdf", "mspdi"]),
    codigo: z.literal("export-bloqueado"),
    mensaje: z.string(),
    bloqueos: z.array(
      z
        .object({ codigo: z.string(), actividadId: z.string().nullable(), detalle: z.string() })
        .strict(),
    ),
    warnings: z.array(warningCronograma),
  })
  .strict();
export class CronogramaBloqueadoError extends Error {
  readonly detalle: z.infer<typeof bloqueoCronogramaSchema>;
  constructor(detalle: z.infer<typeof bloqueoCronogramaSchema>) {
    super(detalle.mensaje);
    this.detalle = detalle;
  }
}

export type ExportacionResponse = z.infer<typeof exportacionResponseSchema>;

/** Secure browser randomness plus a timestamp in the RFC 9562 UUIDv7 layout. */
export function generarClaveExportacion(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = Date.now();
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time & 0xff;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Authenticated JSON POST. No Blob or S3 URL crosses this boundary. */
export async function solicitarExportacion(url: string, body: Record<string, string>, key: string) {
  if (
    !uuidV7.test(key) ||
    !/^\/documentos\/(presupuesto|apus|especificaciones-tecnicas|cronograma)\/[0-9a-f-]+\/exportaciones$/.test(
      url,
    )
  ) {
    throw new TypeError("Solicitud de exportación inválida");
  }
  const { data, status } = await http.post(url, body, {
    headers: { "Idempotency-Key": key },
    validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
  });
  if (status === 409) {
    const cronograma = url.match(/^\/documentos\/cronograma\/([^/]+)\/exportaciones$/);
    const bloqueo = bloqueoCronogramaSchema.safeParse(data);
    if (
      cronograma &&
      bloqueo.success &&
      bloqueo.data.presupuestoId === cronograma[1] &&
      bloqueo.data.formato === body.formato
    ) {
      throw new CronogramaBloqueadoError(bloqueo.data);
    }
    const ruta = url.match(/^\/documentos\/(presupuesto|apus)\/([^/]+)\/exportaciones$/);
    const preflight = documentoPreflightSchema.safeParse(data);
    const { formato, ...opciones } = body;
    const respuestaOpciones = preflight.success
      ? (preflight.data.opciones as Record<string, string>)
      : {};
    if (
      ruta &&
      preflight.success &&
      !preflight.data.exportable &&
      preflight.data.documento === ruta[1] &&
      preflight.data.presupuestoId === ruta[2] &&
      preflight.data.formato === formato &&
      Object.keys(respuestaOpciones).length === Object.keys(opciones).length &&
      Object.entries(respuestaOpciones).every(([nombre, valor]) => opciones[nombre] === valor)
    ) {
      throw new DocumentoPreflightError(preflight.data);
    }
    const error = errorPayloadSchema.safeParse(data);
    throw new ApiError(
      error.success
        ? error.data
        : problemDesconocido(status, "Request failed with status code 409"),
      status,
    );
  }
  if (url.startsWith("/documentos/cronograma/")) {
    const parsed = cronogramaResponseSchema.safeParse(data);
    if (!parsed.success) throw errorDeRespuesta(url, parsed.error);
    const mime: Record<string, string> = {
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      mspdi: "application/xml",
    };
    if (parsed.data.mediaType !== mime[body.formato])
      throw new TypeError("La respuesta no corresponde al formato solicitado");
    return parsed.data;
  }
  const parsed = exportacionResponseSchema.safeParse(data);
  if (!parsed.success) throw errorDeRespuesta(url, parsed.error);
  return parsed.data;
}

/** Called only after an explicit export click and a validated Core response. */
export function navegarDescarga(downloadUrl: string): void {
  if (!ticketPath.test(downloadUrl)) throw new TypeError("Enlace de descarga inválido");
  const base = new URL(API_BASE_URL, window.location.origin);
  if (
    base.pathname.replace(/\/$/, "") !== "/api/v1" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new TypeError("Origen de API inválido");
  }
  const target = new URL(downloadUrl, base.origin);
  if (target.origin !== base.origin || target.pathname !== downloadUrl) {
    throw new TypeError("Enlace de descarga inválido");
  }
  const link = document.createElement("a");
  link.href = target.href;
  link.rel = "noreferrer noopener";
  link.referrerPolicy = "no-referrer";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}
