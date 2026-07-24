# Plan 010: APU Completion (%CI, discount, auxiliaries, templates, breakdown)

> **For agentic workers:** Implement task-by-task in order.

**Goal:** Complete APU editor with %CI editing, discount dialog, auxiliary toggle, save-as-template, calculation breakdown popover, and personal templates page.

**Architecture:** Extends existing useApuEditor hook with three new methods; creates four new components (DialogoDescuentoRubro, DialogoGuardarPlantilla, PopoverDesglose, MisPlantillasPage); updates PieTotales, EncabezadoApu, EditorApuPage, and routes.

**Tech Stack:** React + TypeScript + TanStack Query + shadcn/ui + Lucide icons + sonner toast + MSW

---
