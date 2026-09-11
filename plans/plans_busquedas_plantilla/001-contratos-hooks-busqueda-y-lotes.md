# Plan frontend 001 — Contratos, schemas y hooks para búsqueda y altas atómicas

**Estado:** TODO · **Prioridad:** P0 · **Depende de:** backend 001, 003 y 004

## 01. Resultado observable

La capa API puede consultar plantillas paginadas con filtros SISTEMA/PERSONAL, cargar un detalle bajo demanda, agregar un lote de plantillas y crear un APU manual completo. Cada respuesta se valida con Zod y cada request crítico queda fijado por una prueba de contrato.

## 02. Estado inicial

- `usePlantillas()` consume `GET /plantillas-apu` como array completo.
- `usePlantillaDetalle()` ya consume el detalle correcto.
- `useCrearApu()` y `useRubroMutaciones.agregar` requieren dos operaciones para crear y vincular.
- No existen DTOs ni hooks para búsqueda paginada, lote o APU agregado completo.

## 03. Contratos que se transcriben

No implementar hasta contrastar nombres y códigos con los recursos y tests backend ya fusionados.

```ts
interface BuscarPlantillasParams {
  q?: string;
  tipos: Array<"SISTEMA" | "PERSONAL">;
  page?: number;
  size?: number;
}

interface AgregarPlantillasRequest {
  capituloId?: string;
  plantillaIds: string[];
}

interface ResultadoPlantillaLote {
  plantillaId: string;
  plantillaNombre: string;
  apuId: string;
  codigo: string;
  advertencias: AdvertenciaPlantillaResponse[];
}

interface AgregarPlantillasResponse {
  presupuesto: PresupuestoResponse;
  resultados: ResultadoPlantillaLote[];
}
```

El DTO manual debe copiar exactamente el backend 004. Debe representar cabecera, `porcentajeIndirecto` opcional, destino opcional y filas editables por sección; no debe aceptar totales calculados.

## 04. Alcance

- `src/api/contract.ts`: DTOs exactos.
- `src/api/schemas.ts`: schemas `.strict()` y `paginaDe(plantillaApuResumenSchema)`. Afinar `snapshotSecciones` con un schema price-free `{secciones:[{tipo,lineas:[{esHerramientaMenor?,insumoCodigo?,cantidad?,rendimiento?}]}]}` derivado de `SnapshotApuMapper`; cantidades/rendimientos admiten la representación decimal real del backend. No dejar `unknown` ni usar casts en UI.
- `src/api/queryKeys.ts`: key que incluya `q`, tipos, página y tamaño.
- Nuevo hook de búsqueda debounced o parametrizado; el debounce puede vivir en UI, no en la función HTTP.
- Mutaciones `useAgregarDesdePlantillas` y `useCrearApuCompleto` con `setQueryData(qk.presupuesto(presupuestoId), response.presupuesto)` e invalidación explícita de `qk.apus(presupuestoId)`, validación y cronograma cuando corresponda.
- `src/test/handlers.ts`: handler literal `/plantillas-apu/busqueda` declarado antes de `/:id`, y handlers de escritura estrictos que comprueben ruta, query y cuerpo.
- Pruebas focalizadas de hooks/contrato.

## 05. Fuera de alcance

- Render del diálogo.
- Cambiar `GET /plantillas-apu` usado por `MisPlantillasPage`.
- Cálculos de costos, totales o porcentajes.
- Simular éxito parcial del lote.

## 06. RED crítico

1. La búsqueda envía ambos `tipo` por defecto, `page=0`, `size=20` y valida `Page<T>`.
2. Desmarcar una fuente cambia la query key y la petición; cero fuentes deja el hook deshabilitado y no emite request.
3. El lote envía `plantillaIds` en orden y omite `capituloId` cuando el usuario no eligió destino.
4. El alta manual acepta solo `{capituloId,codigo,descripcion,unidad,porcentajeIndirecto,detalles[{seccionTipo,insumoId,cantidad,rendimiento}]}` y rechaza desde MSW cualquier `costoDirecto`, `costoTotal`, `precioUnitario` o subtotal calculado enviado por el cliente.
5. Un body o respuesta con campo incorrecto falla como `respuesta-invalida`, no se acepta por cast.

## 07. Pasos

1. Leer backend 001/003/004 y copiar formas reales.
2. Añadir DTOs y schemas.
3. Añadir query keys y hooks.
4. Crear handlers MSW con allowlist exacta de campos.
5. Implementar pruebas RED y hacerlas verdes.
6. Confirmar invalidaciones con el árbol devuelto por el servidor; no lanzar un GET redundante si el response ya contiene `PresupuestoResponse`.

## 08. Aceptación

- La primera página puede cargarse sin texto de búsqueda.
- Filtros combinados SISTEMA+PERSONAL no requieren dos consultas.
- Detalle continúa usando `GET /plantillas-apu/{id}`.
- Lote y manual actualizan el presupuesto solo después de éxito.
- Un error atómico conserva el cache anterior.

## 09. Verificación

```bash
pnpm exec vitest run src/test/features/apu-editor/hooks src/test/features/workspace
pnpm run typecheck
pnpm run lint
pnpm run guard:adr9
git diff --check
```

## 10. STOP y rollback

STOP si backend devuelve array en vez de `Page`, cambia la repetición de `tipo`, no identifica el elemento problemático o no devuelve el presupuesto consolidado. No suavizar el schema ni el handler. Rollback: retirar solo DTOs, schemas, keys, hooks y pruebas de este plan.

## 11. Handoff

Publicar estas firmas antes de abrir los worktrees frontend 002 y 003:

- `useBusquedaPlantillas({tipos,q,page,size})` → página validada;
- reutilizar `usePlantillaDetalle(id)` con snapshot ya validado;
- `useAgregarDesdePlantillas(presupuestoId)` → mutación de `{capituloId?,plantillaIds}` a `AgregarPlantillasResponse`;
- `useCrearApuCompleto(presupuestoId)` → mutación del body backend 004.

Los planes 002 y 003 no editan `src/api/**` ni `src/test/handlers.ts`.
