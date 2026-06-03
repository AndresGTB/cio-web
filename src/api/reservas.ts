import apiClient from './client'
import type { Reserva, StockItem, PaginatedResponse } from '@/types'

export interface DetalleLineaResponse {
  linea_id: number
  sku: string
  bodega: string
  open_qty_sap: string | null
  qty_bodega: string
  qty_transito: string
  qty_pendiente_compra: string
  estado_linea: string
  reservas: Reserva[]
  stock: StockItem | null
}

export interface FiltrosReservas {
  linea_ov?: number
  estado?: string
  origen?: string
  sku?: string
  search?: string
  page?: number
  page_size?: number
}

export async function getReservas(filtros: FiltrosReservas = {}): Promise<PaginatedResponse<Reserva>> {
  const { data } = await apiClient.get<PaginatedResponse<Reserva>>('/api/reservas/', { params: filtros })
  return data
}

export async function getReservasPorLinea(lineaId: number): Promise<DetalleLineaResponse> {
  const { data } = await apiClient.get<DetalleLineaResponse>(`/api/ordenes/lineas/${lineaId}/reservas/`)
  return data
}

export async function distribuir(empresa_db?: string, bodega?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/reservas/distribuir/', { empresa_db, bodega })
  return data
}

export async function liberarReserva(id: number, motivo: string): Promise<Reserva> {
  const { data } = await apiClient.post<Reserva>(`/api/reservas/${id}/liberar/`, { motivo })
  return data
}
