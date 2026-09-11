# Plan 058 — Procedencia del insumo (y por qué las bases personales no se pueden construir)

**Status:** BLOCKED — backend contract drift; provenance slice already complete (**audited 2026-09-10**)
**Escrito contra:** frontend `43277fd` · backend `origin/main` @ `c337950`
**Esfuerzo:** S (1–2 h) · **Riesgo:** BAJO
**Depende de:** `061` → `053` → `059`
**Choca con:** `050` — ambos tocan componentes de insumos

> ## ⚠️ Reescritura — la versión anterior no era construible
>
> El plan original proponía tres rebanadas sobre **bases personales**: tipo + hook + añadirlas como
> origen en `DialogoCopiarBase`, una pantalla de gestión, y mostrar la procedencia. Él mismo dejaba
> abierta la pregunta «¿cómo entran insumos en una base personal?» y decía *«si no hay forma de
> llenarla, parar aquí»*.
>
> **Se leyó el backend. No hay forma de llenarla, ni de usarla, ni de verla.** Tres hechos
> verificados en `origin/main @ c337950`:
>
> 1. **`BasesPersonalesResource` tiene tres endpoints y ninguno toca insumos:** `GET` listar,
>    `POST` crear, `DELETE /{id}` borrar. No hay `POST /bases-personales/{id}/insumos`, ni import
>    CSV, ni nada equivalente a lo que sí tienen las centrales.
> 2. **No sirve como origen de copia.** `CopiaBaseService` valida:
>    ```java
>    if (req.fuenteTipo() == null
>            || (!"CENTRAL".equalsIgnoreCase(req.fuenteTipo()) && !"PROYECTO".equalsIgnoreCase(req.fuenteTipo()))) {
>        throw ProblemaException.validacion("fuenteTipo debe ser CENTRAL o PROYECTO");
>    }
>    ```
>    Añadir «base personal» como tercer origen en `DialogoCopiarBase` daría **400**.
> 3. **Es invisible en toda ruta de lectura.** `InsumoCatalogoService` construye
>    `InsumoBusquedaResponse` con `esCentral ? "CENTRAL" : "PROYECTO"`. El valor `PERSONAL` no
>    existe: una base personal no puede salir de ninguna búsqueda ni de ningún selector.
>
> **Conclusión:** una base personal se puede crear, listar y borrar. Es un contenedor con nombre,
> permanentemente vacío e invisible. Construir UI encima sería prometer una feature que no existe.
> Las rebanadas 1 y 2 originales quedan **retiradas**.
>
> Lo que sí queda es la rebanada 3, que nunca dependió de las bases personales.

## Lo que sí hay que hacer — la procedencia del insumo

`InsumoBusquedaResponse` trae dos campos que el frontend **ignora**:

```java
public record InsumoBusquedaResponse(
        UUID id, String codigo, TipoInsumo tipo, String descripcion, String unidad,
        BigDecimal precioUnitario, Instant fechaActualizacion, boolean desactualizado,
        String fuente,        // "CENTRAL" | "PROYECTO"
        String baseNombre) {}
```

`fuente` y `baseNombre` responden a la pregunta de N04 §A9: **de dónde salió este precio.** Hoy el
usuario no puede saberlo, y el dato ya viaja por el cable en cada búsqueda.

> El plan `059` ya corrigió el bug asociado: `SelectorInsumo` comparaba `fuente` contra `"LOCAL"`,
> valor que el backend no emite, así que **todo insumo de proyecto se pintaba como Central**.
> Verifica que ese arreglo está en `main` antes de empezar; si no, este plan lo incluye.

### Qué construir

En `SelectorInsumo` (S-23), junto a cada resultado: la procedencia. `fuente` da el nivel y
`baseNombre` el nombre concreto de la base. Un `baseNombre` nulo o vacío no debe pintar nada — no
inventes una etiqueta por defecto.

Reutiliza el componente de etiqueta que ya exista en el repo para esto (`ChipEstado` y los badges
de `components/ui/` son los candidatos; **mira antes de crear uno nuevo**).

### Test rojo primero

Un test de `SelectorInsumo` que monte resultados con `fuente: "CENTRAL"` y `fuente: "PROYECTO"`,
cada uno con su `baseNombre`, y compruebe que la procedencia sale distinguible en ambos. Falla hoy:
el componente no pinta ninguno de los dos campos.

Un segundo caso con `baseNombre: null` que compruebe que **no** aparece etiqueta de base.

## La pregunta que queda para el backend

Anotada aquí porque no tiene otro sitio, y **no la resuelve el frontend**:

> Las bases personales (N04 §A9) tienen `GET`/`POST`/`DELETE` en `/bases-personales` pero ningún
> camino para meterles insumos, ninguna forma de usarlas como origen de copia, y no aparecen en
> `InsumoBusquedaResponse.fuente`. Tal como está, la feature no es utilizable desde ninguna UI.
> **¿Se completa en el backend, o se retira?** Hasta que se responda, el frontend no construye nada
> encima: sería una pantalla que crea contenedores vacíos.

Si el backend las completa, este plan se reabre con las rebanadas retiradas y el `fuente` ganará un
tercer valor.

### Auditoría 2026-09-10 — ejecución bloqueada

La auditoría contra el `main` backend disponible (`2803575a`, `/home/kaandradec/Documents/workspace/uce/proyecto-grado/thesis-back-quarkus`) contradice la premisa anterior:

- `ResolverInsumoProyectoService` soporta insumos `PERSONAL` y los materializa mediante copia al usar.
- `BasesPersonalesResourceIT` documenta la alimentación de una base PERSONAL mediante ese flujo y prueba la cascada de sus insumos.
- `BasesPersonalesResource` mantiene únicamente `GET`/`POST`/`DELETE` para la gestión directa, mientras `InsumoCatalogoService` sigue exponiendo en el selector sólo `CENTRAL` y `PROYECTO`.

La ruta relativa `../thesis-back-quarkus` de este worktree existe como directorio vacío y no contiene un checkout Git; por ello se usó el checkout backend disponible indicado arriba, siempre en modo lectura. No se añade UI PERSONAL ni se cambia el contrato frontend hasta resolver esta divergencia.

Además, la rebanada de procedencia ya está implementada y cubierta: `SelectorInsumo.tsx` muestra `Central`/`Local` y `baseNombre` condicional; `SelectorInsumo.test.tsx` cubre `CENTRAL`, `PROYECTO` y `baseNombre: null`; `contract.ts` y `schemas.ts` reflejan `fuente: CENTRAL | PROYECTO` y `baseNombre: string | null`.

## Definición de hecho

- `pnpm run verify` en verde.
- `SelectorInsumo` muestra `fuente` y `baseNombre` de cada resultado, distinguiendo CENTRAL de
  PROYECTO, y no pinta nada cuando `baseNombre` viene nulo.
- Dos tests nuevos de `SelectorInsumo`, ambos rojos antes del cambio.
- **Cero** código de bases personales: ni tipo en `contract.ts`, ni hook, ni pantalla, ni origen
  nuevo en `DialogoCopiarBase`. Si algo de eso aparece en el diff, el plan se ejecutó mal.
