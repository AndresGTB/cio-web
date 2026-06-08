import apiClient from './client'
import type { StockItem, OrdenCompra, FacturaReserva, PaginatedResponse } from '@/types'

export type FiltroRapidoStock = 'todos' | 'con_stock' | 'en_oc' | 'en_factura_reserva' | 'pendiente_compra'

export interface FiltrosStock {
  sku?: string
  bodega_codigo?: string
  empresa_db?: string
  search?: string
  page?: number
  page_size?: number
  con_stock?: 'true'
  en_oc?: 'true'
  en_factura_reserva?: 'true'
  pendiente_compra?: 'true'
}

export async function getStock(filtros: FiltrosStock = {}): Promise<PaginatedResponse<StockItem>> {
  const { data } = await apiClient.get<PaginatedResponse<StockItem>>('/api/inventario/stock/', { params: filtros })
  return data
}

export async function getOrdenesCompra(
  filtros: { search?: string; page?: number } = {}
): Promise<PaginatedResponse<OrdenCompra>> {
  const { data } = await apiClient.get<PaginatedResponse<OrdenCompra>>(
    '/api/inventario/ordenes-compra/',
    { params: filtros }
  )
  return data
}

export async function sincronizarStock(bodega?: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/sap/sync/stock/', bodega ? { bodega } : {})
  return data
}

export async function sincronizarOrdenesCompra(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/sap/sync/ordenes-compra/')
  return data
}

export async function sincronizarFacturasReserva(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/sap/sync/facturas-reserva/')
  return data
}

export async function sincronizarCompleto(forzar_completo = false): Promise<void> {
  await apiClient.post('/api/sap/sync/completo/', { forzar_completo })
}

export interface SyncEstado {
  en_proceso: boolean
  iniciado_en: string | null
  resultado: Record<string, unknown> | null
  error: string | null
}

export async function getSyncEstado(): Promise<SyncEstado> {
  const { data } = await apiClient.get('/api/sap/sync/estado/')
  return data
}

export interface FiltrosFacturasReserva {
  search?: string
  sku?: string
  estado?: 'ABIERTA' | 'CERRADA'
  page?: number
  page_size?: number
}

export async function getFacturasReserva(
  filtros: FiltrosFacturasReserva = {}
): Promise<PaginatedResponse<FacturaReserva>> {
  const { data } = await apiClient.get<PaginatedResponse<FacturaReserva>>(
    '/api/inventario/facturas-reserva/',
    { params: filtros }
  )
  return data
}

export async function getFacturaReservaDetalle(id: number): Promise<FacturaReserva> {
  const { data } = await apiClient.get<FacturaReserva>(
    `/api/inventario/facturas-reserva/${id}/`
  )
  return data
}
