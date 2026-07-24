# Shell

## Decisión: selector de versión por `?v=` (search-param)

`design/02 §5.3` marcaba como provisional la elección entre:

1. **Search-param `?v=`** (propuesta del diseño) — más ligero, rutas más limpias.
2. **Rutas anidadas `/versiones/:vId/...`** — más explícito pero más ruidoso.

**Se implementó la opción 1 (`?v=`).** Motivos:

- Coincide con la propuesta documentada en el diseño.
- El mapa de rutas en `design/02 §2` no requiere cambios.
- El criterio de aceptación `TC-P43-02` ya asume persistencia en `?v=`.
- Feature modules leen la versión activa mediante `useVersionActiva()` (nunca leen `?v=` directamente).
- Normalización de URL: si `?v=` apunta a una versión de otro proyecto, se reescribe silenciosamente a la vigente.

### Alternativa descartada

Rutas anidadas (ej. `/proyectos/1/versiones/2/apus`). Se descartó porque:

- Duplica el concepto de "versión activa" en cada enlace.
- Hace más compleja la navegación entre módulos que comparten versión.
- Dificulta persistir la versión activa al cambiar de proyecto.

## Arquitectura

- `contexto.ts` — `useProyectoActivoId`, `useVersiones`, `useVersionActiva`.
- `useVersionActiva` es el hook único para toda la app. Ningún feature module debe leer `?v=` directamente.
