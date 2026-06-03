import apiClient from './client'
import type { Parametro, PaginatedResponse } from '@/types'

export async function getParametros(): Promise<PaginatedResponse<Parametro>> {
  const { data } = await apiClient.get<PaginatedResponse<Parametro>>('/api/parametros/')
  return data
}

export async function updateParametro(clave: string, valor: string): Promise<Parametro> {
  const { data } = await apiClient.patch<Parametro>(`/api/parametros/${clave}/`, { valor })
  return data
}
