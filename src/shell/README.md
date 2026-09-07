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

- `contexto.ts` — `useProyectoActivoId` y `useVersionActiva`. `useVersiones` ya no
  vive aquí: era una copia del de `features/presupuesto/hooks/usePresupuesto.ts`
  con la misma `queryKey` y la misma URL, o sea dos hooks sobre la misma entrada
  de caché que nada obligaba a moverse juntos. `contexto.ts` importa aquél
  (plan 060). La dirección `shell/ → features/` no es nueva: `Breadcrumbs`,
  `SelectorProyecto` y `Sidebar` ya la usaban.
- `useVersionActiva` es el hook único para toda la app. Ningún feature module debe leer `?v=` directamente.
  La corrección de un `?v=` inválido vive en un `useEffect`, no en el cuerpo del
  render: hacerlo durante el render dispara un `setState` de otro componente.
- Las pantallas de APU toman el `presupuestoId` de este hook, **nunca** del `:id`
  de la ruta — ese id es el del proyecto, y usarlo como versión devolvía los APUs
  de otro presupuesto con aspecto de correctos (plan 019).

## Rail lateral

`<Sidebar collapsible="icon">`: al plegarlo quedan los iconos, no desaparece.
Por eso cada entrada lleva `tooltip` — es el único rótulo que queda plegado — y
la insignia "pronto" de los módulos sin backend se oculta en ese estado.

El padding y el espaciado de página los pone el shell (`main` con
`flex flex-col gap-5 p-6`), no cada página: las páginas devuelven un fragmento
con `EncabezadoPagina` y su contenido, sin `p-6` ni `space-y-*`.
