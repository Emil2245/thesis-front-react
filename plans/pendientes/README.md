# `pendientes/` — planes 075–096 (archivo histórico)

> **Aviso de vigencia (corte funcional frontend `be5fc776`, backend `origin/main @ ac84c945`).** Esta carpeta es
> **un archivo histórico de planes ejecutables** escritos durante la auditoría 2026-09-09 y
> posteriores; **no refleja trabajo pendiente**. Los planes aquí listados fueron ejecutados
> casi por completo y están cerrados o superseded en [`main`](../00.INDEX.md):
>
> - **Cerrados e integrados** (DONE): 075, 076, 082, 083, 084, 085, 086, 087, 090, 091, 092,
>   093, 094, 095, 096. (Los planes 077–081 también están DONE, pero **no viven en esta
>   carpeta**: tras integrarse salieron de `pendientes/` y quedaron en la raíz de
>   [`plans/`](../README.md).)
> - **Superseded**: 088 (Resumen y Cronograma conservan rutas separadas).
>
> **Trabajo funcional pendiente hoy** es mucho más corto: **058** (bases personales, BLOCKED
> por deriva del contrato backend PERSONAL), **074** (armado posterior de APU dentro de
> `EditorApuPage`, DEFERRED) y **089** (integración final y documentación, TODO — depende de
> 058/072); **056** (responsive) sigue en espera de decisión de producto. Estado vivo y
> enlaces a la evidencia por plan en [`../00.INDEX.md`](../00.INDEX.md).
>
> Los cuerpos de los planes no se reescribieron: son artefactos de la fecha de auditoría y
> pueden conservar referencias a commits previos (p. ej. backend `c337950`/`2803575`) o a
> estados ya cerrados. Para el estado verificado al cierre lee el índice y la bitácora.

---

## Qué contiene esta carpeta

Planes ejecutables derivados de la auditoría del 2026-09-09. Ejecutar en el DAG indicado en
[`../00.INDEX.md`](../00.INDEX.md), en serie cuando compartan `src/api/` o handlers. Cada plan
contiene las 17 secciones obligatorias y mantiene las invariantes de API única y cero
aritmética monetaria.

- `075-baseline-y-correcciones-de-contrato.md` *(DONE)*
- `076-validación-runtime-y-contratos.md` *(DONE)*
- `082-workspace-shell-accesible.md` *(DONE)*
- `083-presupuesto-compacto-y-selección.md` *(DONE)*
- `084-pestaña-APU.md` *(DONE)*
- `085-pestaña-Insumos.md` *(DONE)*
- `086-pestaña-especificaciones-técnicas.md` *(DONE)*
- `087-vistas-de-cronograma.md` *(DONE)*
- `088-resumen-e-integración-opcional.md` *(SUPERSEDED)*
- `089-integración-final-y-documentación.md` *(TODO — depende de 058/072)*
- `090-selector-de-vistas-cronograma.md` *(DONE)*
- `091-gantt-jerarquico-interactivo.md` *(DONE)*
- `092-cronograma-valorizado-matricial.md` *(DONE)*
- `093-curva-s-grafica.md` *(DONE)*
- `094-formato-numerico-consistente.md` *(DONE)*
- `095-desborde-grafico-curva-s.md` *(DONE)*
- `096-vista-previa-visual-barras-gantt.md` *(DONE)*
