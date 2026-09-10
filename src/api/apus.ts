import type { ApuResponse, EspecificacionTecnicaResponse } from "./contract";
import { getValidado, putValidado } from "./request";
import { apuSchema, especificacionTecnicaSchema } from "./schemas";

export function getApu(apuId: string): Promise<ApuResponse> {
  return getValidado(`/apus/${apuId}`, apuSchema);
}

export function getEspecificacionTecnica(apuId: string): Promise<EspecificacionTecnicaResponse> {
  return getValidado(`/apus/${apuId}/especificacion-tecnica`, especificacionTecnicaSchema);
}

export function putEspecificacionTecnica(apuId: string, texto: string): Promise<ApuResponse> {
  return putValidado(`/apus/${apuId}/especificacion-tecnica`, apuSchema, { texto });
}
