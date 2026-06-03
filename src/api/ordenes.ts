import apiClient from './client'
import type {
  OrdenVenta,
  LineaOV,
  LineaOVDetallada,
  ResumenDashboard,
  PaginatedResponse,
  EstadoLinea,
} from '@/types'

interface FiltrosOV {
  estado?: string
  origen?: string
  search?: string
  page?: number
}

export interface FiltrosLineas {
  estado?: EstadoLinea | ''
  bodega?: string
  search?: string
  fecha_desde?: string
  fecha_hasta?: string
  page?: number
  page_size?: number
}

export async function getOrdenes(filtros: FiltrosOV = {}): Promise<PaginatedResponse<OrdenVenta>> {
  const { data } = await apiClient.get<PaginatedResponse<OrdenVenta>>('/api/ordenes/', {
    params: filtros,
  })
  return data
}

export async function getOrden(id: number): Promise<OrdenVenta> {
  const { data } = await apiClient.get<OrdenVenta>(`/api/ordenes/${id}/`)
  return data
}

export async function getLineasOV(id: number): Promise<LineaOV[]> {
  const { data } = await apiClient.get<LineaOV[]>(`/api/ordenes/${id}/lineas/`)
  return data
}

export async function getLineasPendientes(
  filtros: FiltrosLineas = {}
): Promise<PaginatedResponse<LineaOVDetallada>> {
  const params: Record<string, string | number | undefined> = {}
  if (filtros.estado) params.estado = filtros.estado
  if (filtros.bodega) params.bodega = filtros.bodega
  if (filtros.search) params.search = filtros.search
  if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde
  if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta
  if (filtros.page) params.page = filtros.page
  if (filtros.page_size) params.page_size = filtros.page_size

  const { data } = await apiClient.get<PaginatedResponse<LineaOVDetallada>>(
    '/api/ordenes/lineas/',
    { params }
  )
  return data
}

export async function getResumenDashboard(): Promise<ResumenDashboard> {
  const { data } = await apiClient.get<ResumenDashboard>('/api/ordenes/resumen/')
  return data
}
