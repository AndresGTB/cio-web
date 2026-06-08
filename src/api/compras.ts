import apiClient from './client'
import type { SugerenciaCompra, ResumenCompras, AnalisisDMI, ResumenDMI, PaginatedResponse } from '@/types'

export interface FiltrosSugerencias {
  urgencia?: string
  estado?: string
  search?: string
  page?: number
  page_size?: number
}

export async function getSugerencias(filtros: FiltrosSugerencias = {}): Promise<PaginatedResponse<SugerenciaCompra>> {
  const { data } = await apiClient.get('/api/compras/sugerencias/', { params: { page_size: 50, ...filtros } })
  return data
}

export async function getResumenCompras(): Promise<ResumenCompras> {
  const { data } = await apiClient.get('/api/compras/sugerencias/resumen/')
  return data
}

export async function generarSugerencias(empresa_db?: string, bodega?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/compras/sugerencias/generar/', { empresa_db, bodega })
  return data
}

export async function gestionarSugerencia(
  id: number,
  payload: { accion: 'ACEPTAR' | 'IGNORAR'; motivo_excepcion?: string; motivo_texto?: string }
): Promise<SugerenciaCompra> {
  const { data } = await apiClient.patch(`/api/compras/sugerencias/${id}/gestionar/`, payload)
  return data
}

export async function getAnalisisDMI(filtros: { clasificacion?: string; sku?: string; page?: number } = {}): Promise<PaginatedResponse<AnalisisDMI>> {
  const { data } = await apiClient.get('/api/compras/dmi/', { params: { page_size: 50, ...filtros } })
  return data
}

export async function getResumenDMI(): Promise<ResumenDMI> {
  const { data } = await apiClient.get('/api/compras/dmi/resumen/')
  return data
}

export async function analizarDMI(empresa_db?: string, bodega?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/compras/dmi/analizar/', { empresa_db, bodega })
  return data
}
