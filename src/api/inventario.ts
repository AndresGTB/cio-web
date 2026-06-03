import apiClient from './client'
import type { StockItem, OrdenCompra, PaginatedResponse } from '@/types'

export interface FiltrosStock {
  sku?: string
  bodega_codigo?: string
  empresa_db?: string
  search?: string
  page?: number
  page_size?: number
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
