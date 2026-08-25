# Design tokens

## Tema neutro (blanco y negro)

El azul de marca se retiró: `--primary`, `--ring` y `--chart-1` no tienen croma.
Es el neutro de shadcn.

- **60 %** — `background`, `card`, `sidebar` (neutros)
- **30 %** — `secondary`, `muted`, `sidebar-accent` (gris claro)
- **10 %** — `primary`, `accent`, `ring` (`oklch(0.205 0 0)`, casi negro)

**Nunca uses colores crudos de Tailwind** (`bg-blue-500`, `text-green-600`). Si
necesitas distinguir series en una gráfica, usa opacidades de `bg-foreground`,
que invierten solas en modo oscuro — es lo que hace `GanttChart`. La rampa
`--chart-1..5` es toda neutra, así que no sirve para categorías; definir una
rampa categórica en oklch sigue pendiente.

## Semantic tokens (outside the ratio)

| Token           | Use             | OKLCH         |
| --------------- | --------------- | ------------- |
| `--exito`       | Success / green | 0.60 0.13 150 |
| `--advertencia` | Warning / amber | 0.75 0.15 80  |
| `--peligro`     | Danger / red    | 0.58 0.20 25  |

Son señal de estado, no marca: sobreviven al tema neutro igual que el
`--destructive` de shadcn. Cada uno tiene su variante `-texto`, más oscura, para
texto sobre tinte al 15 % — usar la variante de relleno (`-foreground`) como
color de texto hace que desaparezca.

## Typography

- Font: Geist Variable (sans-serif)
- Tabular numerals: `.num` class (`font-variant-numeric: tabular-nums`)

## Grid density

`--altura-fila-grid: 2rem` — compact rows for data tables.

## Number formatting

Locale `es-EC`: decimal comma, thousands dot, USD currency. All money/percentage
display goes through `src/lib/decimal.ts` formatters — never `toFixed` or
`parseFloat` outside that module.

## Dark mode

Low priority (open decision, `design/01 §10.2`). shadcn defaults only.
