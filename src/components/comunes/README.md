# Design tokens

## 60-30-10 colour discipline

- **60 %** — `background`, `card`, `sidebar` (neutral slate via shadcn defaults)
- **30 %** — `secondary`, `muted`, `sidebar-accent` (light grey)
- **10 %** — `primary`, `accent`, `ring` (blue, `oklch(0.55 0.16 255)`)

## Semantic tokens (outside the ratio)

| Token           | Use             | OKLCH         |
| --------------- | --------------- | ------------- |
| `--exito`       | Success / green | 0.60 0.13 150 |
| `--advertencia` | Warning / amber | 0.75 0.15 80  |
| `--peligro`     | Danger / red    | 0.58 0.20 25  |

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
