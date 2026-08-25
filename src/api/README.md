# Seam con el backend

`contract.ts` está **escrito a mano** desde `thesis-docs/plan/architecture/07-api-contract.md`
§11 (Apéndice B) porque el backend Quarkus todavía no expone OpenAPI.

Cuando el backend publique `/q/openapi`:

1. `OPENAPI_URL=<url> pnpm run gen:api` → genera `src/api/schema.d.ts`.
2. Reescribe `contract.ts` para re-exportar desde `schema.d.ts`
   (`export type ApuResponse = components["schemas"]["ApuResponse"]`), manteniendo
   `Decimal` donde el generador diga `string` en campos de dinero/porcentaje.
3. Cualquier discrepancia entre lo generado y lo escrito a mano es un **defecto de
   contrato**: repórtalo, no lo parchees en el cliente.

Regla: este directorio es la ÚNICA costura con el backend (architecture/08 §8).
Ningún archivo bajo `src/features/**` importa axios ni construye una URL.

## `request.ts` no valida nada

`get<T>()` promete `T` y hace un cast puro. Una URL equivocada o una deriva del
backend no dan error de red ni de tipos: dan una pantalla en blanco o un
`TypeError` en runtime. Dos bugs reales nacieron así — el tipo
`PlantillaApuDetalleResponse[]` sobre el endpoint de listado (plan 020) y
`ApiError.slug` reventando cuando el cuerpo del error no traía `type`.

Hasta que el backend publique OpenAPI, la mitigación es endurecer en el borde
(`contenido ?? []`) y no confiar en que el tipo describe la respuesta.
