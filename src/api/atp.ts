import apiClient from './client'
import type {
  ConfiguracionATP,
  EjecucionATP,
  ResumenATP,
  ClienteConfig,
  ModoATP,
  PaginatedResponse,
} from '@/types'

export async function getResumenATP(empresa_db?: string, bodega?: string): Promise<ResumenATP> {
  const { data } = await apiClient.get<ResumenATP>('/api/atp/resumen/', {
    params: { empresa_db, bodega },
  })
  return data
}

export async function ejecutarATP(
  empresa_db?: string,
  bodega?: string,
  modo?: ModoATP | null,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/atp/ejecutar/', { empresa_db, bodega, modo })
  return data
}

export async function simularATP(
  empresa_db?: string,
  bodega?: string,
): Promise<{ comparativa: Record<string, Record<string, unknown>> }> {
  const { data } = await apiClient.post('/api/atp/simular/', { empresa_db, bodega })
  return data
}

export async function getConfiguracionATP(
  empresa_db?: string,
): Promise<ConfiguracionATP & { _es_default?: boolean }> {
  const { data } = await apiClient.get<ConfiguracionATP & { _es_default?: boolean }>(
    '/api/atp/configuracion/',
    { params: { empresa_db } },
  )
  return data
}

export async function patchConfiguracionATP(
  payload: Partial<ConfiguracionATP> & { empresa_db: string },
): Promise<ConfiguracionATP> {
  const { data } = await apiClient.patch<ConfiguracionATP>('/api/atp/configuracion/', payload)
  return data
}

export async function getEjecuciones(
  empresa_db?: string,
  page = 1,
): Promise<PaginatedResponse<EjecucionATP>> {
  const { data } = await apiClient.get<PaginatedResponse<EjecucionATP>>('/api/atp/ejecuciones/', {
    params: { empresa_db, page },
  })
  return data
}

export interface FiltrosClientes {
  empresa_db?: string
  search?: string
  nivel_cliente?: string
  page?: number
  page_size?: number
}

export async function getClientes(
  filtros: FiltrosClientes = {}
): Promise<PaginatedResponse<ClienteConfig>> {
  const { data } = await apiClient.get<PaginatedResponse<ClienteConfig>>('/api/clientes/', {
    params: { page_size: 50, ...filtros },
  })
  return data
}

export async function patchCliente(
  id: number,
  payload: Partial<ClienteConfig>,
): Promise<ClienteConfig> {
  const { data } = await apiClient.patch<ClienteConfig>(`/api/clientes/${id}/`, payload)
  return data
}

export async function importarClientesSAP(): Promise<{ creados: number; mensaje: string }> {
  const { data } = await apiClient.post('/api/clientes/importar-sap/')
  return data
}
