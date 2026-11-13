# Seam con el backend

`contract.ts` está **escrito a mano** desde `thesis-docs/plan/architecture/07-api-contract.md`
§11 (Apéndice B). El backend Quarkus expone OpenAPI en `/q/openapi` y `package.json` trae el
script `gen:api`, pero el frontend mantiene este contrato manual hasta adoptar la salida
generada:

1. `OPENAPI_URL=<url> pnpm run gen:api` → genera `src/api/schema.d.ts`.
2. Reescribe `contract.ts` para re-exportar desde `schema.d.ts`
   (`export type ApuResponse = components["schemas"]["ApuResponse"]`), manteniendo
   `Decimal` donde el generador diga `string` en campos de dinero/porcentaje.
3. Cualquier discrepancia entre lo generado y lo escrito a mano es un **defecto de
   contrato**: repórtalo, no lo parchees en el cliente.

Regla: este directorio es la ÚNICA costura con el backend (architecture/08 §8).
Ningún archivo bajo `src/features/**` importa axios ni construye una URL.

## Validación en el borde

`get<T>()` de `request.ts` promete `T` y hace un cast puro: una URL equivocada o una deriva del
backend no dan error de red ni de tipos, dan una pantalla en blanco o un `TypeError` en runtime.
Dos bugs reales nacieron así — el tipo `PlantillaApuDetalleResponse[]` sobre el endpoint de
listado (plan 020) y `ApiError.slug` reventando cuando el cuerpo del error no traía `type`.

Para los endpoints críticos usa `getValidado(url, schema)` (Zod, `schemas.ts`), que valida la
respuesta en el borde y falla con un error de contrato explícito. Donde todavía se use `get<T>()`,
endurece el borde (`contenido ?? []`) y no confíes en que el tipo describe la respuesta.

## Exportación de documentos

`exportaciones.ts` implementa `POST /documentos/{documento}/{id}/exportaciones` con
`Idempotency-Key` UUIDv7, valida la respuesta con Zod y solo expone el ticket de un solo uso
`/api/v1/documentos/descargas/{ticket}` (`navegarDescarga`). No hay descargas GET de bytes.
