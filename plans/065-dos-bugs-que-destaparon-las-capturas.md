# Plan 065 — Dos bugs de UI que las capturas tapaban

**Status:** TODO
**Escrito contra:** frontend `main` tras la ola 7 · backend `origin/main` @ `c337950`
**Esfuerzo:** S (30–45 min) · **Riesgo:** BAJO — dos arreglos de una línea cada uno
**Ola:** 8 — cierra la ruta
**Origen:** hallazgos del plan `064`, verificados por el orquestador leyendo el backend y el PNG

Dos defectos que solo se veían mirando las capturas de verdad. No comparten causa; van juntos
porque los dos son de una línea y ninguno se pisa con el otro.

---

## 1 — Todos los APU dicen «Valor propio», también los que heredan

### El defecto

`ApuResponse` en `origin/main` lleva `@JsonInclude(JsonInclude.Include.NON_NULL)`:

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApuResponse(
        UUID id, String codigo, String descripcion, String unidad,
        BigDecimal costoDirecto, BigDecimal costoIndirecto, BigDecimal costoTotal,
        BigDecimal porcentajeIndirecto,          // ← ausente cuando hereda
        BigDecimal porcentajeIndirectoEfectivo,
        List<ApuSeccionResponse> secciones,
        List<AdvertenciaPlantillaResponse> advertencias) {}
```

Cuando un APU **hereda** el %CI del proyecto, `porcentajeIndirecto` es `null` en Java y Jackson
**omite el campo**. En TypeScript llega `undefined`, no `null`.

`PieTotales.tsx` lo comprueba dos veces con desigualdad estricta:

```tsx
{apu.porcentajeIndirecto !== null && <Badge variant="secondary">Valor propio</Badge>}
...
{!editandoCi && apu.porcentajeIndirecto !== null && ( <Button …>Usar valor del proyecto</Button> )}
```

`undefined !== null` es **`true`**. Así que **todos** los APU muestran la insignia «Valor propio» y
el enlace «usar valor del proyecto», hereden o no. La insignia miente en el caso más común.

**La intención está escrita tres decenas de líneas más arriba, en el mismo archivo:**

```tsx
setCiValor(apu.porcentajeIndirecto != null ? String(apu.porcentajeIndirecto) : "");
```

`!= null` — desigualdad **laxa**, que sí atrapa `undefined`. Alguien lo escribió bien una vez y mal
dos veces.

### El arreglo

Las dos comparaciones pasan a `!= null`. Es la forma correcta y la que ya usa el propio archivo.

**Antes de dar el arreglo por bueno**, `grep` el resto del repo por `!== null` y `=== null` sobre
campos que el backend declara nullable: `@JsonInclude(NON_NULL)` está en varios records
(`ApuResponse`, `ProyectoDesdePlantillaResponse`, `AdvertenciaPlantillaResponse`…) y este mismo
error puede estar repetido. Arréglalos todos: la corrección barata es la de raíz.

### Test rojo primero

Un test de `PieTotales` con un APU **sin** la clave `porcentajeIndirecto` (no con `null`: sin la
clave, que es lo que manda el backend) que compruebe que **no** sale «Valor propio» ni el botón.
Falla hoy.

Un segundo caso con `porcentajeIndirecto: 0.22` que compruebe que **sí** salen.

> Ojo con la fixture: si la fixture de APU trae `porcentajeIndirecto: null`, el test pasa en falso.
> Tiene que **omitir la clave**. Eso es exactamente lo que enmascaraba este bug en los stubs viejos.

---

## 2 — El color de «Equipo» no existe

### El defecto

`ResumenComponentes.tsx` pinta cada componente con una clase de Tailwind:

```ts
const COMPONENTE_META: Record<string, { label: string; color: string }> = {
  EQUIPO: { label: "Equipo", color: "bg-chart-1" },
  MANO_OBRA: { label: "Mano de obra", color: "bg-exito" },
  MATERIAL: { label: "Material", color: "bg-advertencia" },
  TRANSPORTE: { label: "Transporte", color: "bg-muted-foreground" },
};
```

`src/index.css` define `--chart-1` en `:root` y en el bloque oscuro, **pero no lo mapea en
`@theme inline`**. Tailwind v4 genera `bg-<nombre>` a partir de `--color-<nombre>`, y ahí están
`--color-exito`, `--color-advertencia` y el resto — pero **no `--color-chart-1`**.

Resultado: `bg-chart-1` no produce color. En `screenshots/08-presupuesto.png` se ve a simple vista:
«Equipo» es el único de los cuatro **sin punto de color**, y su segmento de barra es invisible
mientras los otros tres se pintan.

### El arreglo

Añadir el mapeo que falta al bloque `@theme inline` de `src/index.css`, junto a los demás
`--color-*`:

```css
--color-chart-1: var(--chart-1);
```

**Comprueba si hay más.** `--chart-2` … `--chart-5` probablemente están igual: definidas y sin
mapear. Si el repo las define, mapéalas todas — o borra las que nadie use, que también vale y es
más lazy. Lo que no vale es dejar la mitad.

### Test rojo primero

Este no se prueba bien con vitest: es CSS generado en build. La verificación honesta es la captura.

- Corre `pnpm run e2e:screenshots`.
- **Abre `screenshots/08-presupuesto.png` y míralo.** Los cuatro componentes deben tener punto de
  color y los cuatro segmentos de barra deben verse.
- Commitea la captura nueva.

Si prefieres una guarda automática, un test que compruebe que cada valor de `COMPONENTE_META.color`
tiene su `--color-*` correspondiente en `index.css` es barato y no depende del navegador. Opcional.

---

## Definición de hecho

- `pnpm run verify` y `pnpm run e2e` en verde.
- Cero `!== null` / `=== null` sobre campos que el backend omite por `@JsonInclude(NON_NULL)`.
- Dos tests de `PieTotales`: sin la clave `porcentajeIndirecto` no sale «Valor propio»; con valor,
  sí. El primero falla si se vuelve a `!== null`.
- Los cuatro componentes del desglose se ven con color en `screenshots/08-presupuesto.png`,
  **comprobado mirando el PNG**.
- Ninguna variable `--chart-*` queda definida y sin mapear (o las sobrantes, borradas).
