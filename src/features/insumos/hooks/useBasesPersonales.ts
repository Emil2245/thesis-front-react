import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { del, getValidado, postValidado } from "@/api/request";
import { basePersonalSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { BaseInsumosCrearRequest } from "@/api/contract";

/** `GET /bases-personales` — lista pelada, sólo las del usuario autenticado. */
export function useBasesPersonales() {
  return useQuery({
    queryKey: qk.basesPersonales(),
    queryFn: () => getValidado("/bases-personales", z.array(basePersonalSchema)),
  });
}

export function useCrearBasePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BaseInsumosCrearRequest) =>
      postValidado("/bases-personales", basePersonalSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.basesPersonales() });
    },
  });
}

/** Borrado físico: los insumos de la base caen por la FK `ON DELETE CASCADE`. */
export function useEliminarBasePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/bases-personales/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.basesPersonales() });
    },
  });
}
