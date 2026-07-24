import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, descargar } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ValidacionPresupuestoResponse } from "@/api/contract";
import { toast } from "sonner";

export function useValidacionExport(presupuestoId: number) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () => get<ValidacionPresupuestoResponse>(`/presupuestos/${presupuestoId}/validacion`),
    enabled: presupuestoId > 0,
  });
}

export function useExportar() {
  const descargarConFallback = useCallback(async (url: string, nombre: string) => {
    try {
      const blob = await descargar(url);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al descargar");
    }
  }, []);

  return { descargarConFallback };
}

export const opcionesExport = [
  {
    key: "presupuesto-pdf",
    label: "Presupuesto (PDF)",
    endpoint: (id: number) => `/presupuestos/${id}/exportar/pdf`,
    nombre: (pid: string) => `presupuesto_${pid}.pdf`,
  },
  {
    key: "presupuesto-excel",
    label: "Presupuesto (Excel)",
    endpoint: (id: number) => `/presupuestos/${id}/exportar/excel`,
    nombre: (pid: string) => `presupuesto_${pid}.xlsx`,
  },
  {
    key: "apus",
    label: "APUs",
    endpoint: (id: number) => `/presupuestos/${id}/apus/exportar`,
    nombre: (pid: string) => `apus_${pid}.pdf`,
  },
  {
    key: "cronograma",
    label: "Cronograma",
    endpoint: (id: number) => `/presupuestos/${id}/cronograma/exportar`,
    nombre: (pid: string) => `cronograma_${pid}.pdf`,
  },
] as const;
