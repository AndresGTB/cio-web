import apiClient from './client'
import type {
  BorradorFacturaItem,
  EjecucionPipeline,
  EntregaItem,
  ItemPipeline,
  PaginatedResponse,
  ProyeccionMensual,
  ResumenFacturacion,
} from '@/types'

export interface FiltrosPipeline {
  estado_facturable?: string
  tipo_ov?: string
  tipo_documento?: string
  cliente_codigo?: string
  fecha_desde?: string
  fecha_hasta?: string
  search?: string
  page?: number
  page_size?: number
}

export interface FiltrosEntregas {
  cliente_codigo?: string
  fecha_desde?: string
  fecha_hasta?: string
  estado?: string
  page?: number
}

export interface FiltrosBorradores {
  cliente_codigo?: string
  orden_venta_id?: number
  fecha_vencimiento_hasta?: string
  page?: number
}

export async function getPipeline(
  filtros: FiltrosPipeline = {}
): Promise<PaginatedResponse<ItemPipeline>> {
  const { data } = await apiClient.get('/api/facturacion/pipeline/', {
    params: { page_size: 50, ...filtros },
  })
  return data
}

export async function getPipelineDetalle(id: number): Promise<ItemPipeline> {
  const { data } = await apiClient.get(`/api/facturacion/pipeline/${id}/`)
  return data
}

export async function getResumenFacturacion(): Promise<ResumenFacturacion> {
  const { data } = await apiClient.get('/api/facturacion/pipeline/resumen/')
  return data
}

export async function getProyeccionFacturacion(
  meses = 6
): Promise<ProyeccionMensual[]> {
  const { data } = await apiClient.get('/api/facturacion/pipeline/proyeccion/', {
    params: { meses },
  })
  return data
}

export async function calcularPipeline(
  empresa_db?: string
): Promise<EjecucionPipeline> {
  const { data } = await apiClient.post('/api/facturacion/pipeline/calcular/', {
    empresa_db,
  })
  return data
}

export async function getEjecucionesPipeline(): Promise<
  PaginatedResponse<EjecucionPipeline>
> {
  const { data } = await apiClient.get('/api/facturacion/ejecuciones/')
  return data
}

export async function getEntregas(
  filtros: FiltrosEntregas = {}
): Promise<PaginatedResponse<EntregaItem>> {
  const { data } = await apiClient.get('/api/facturacion/entregas/', {
    params: { page_size: 50, ...filtros },
  })
  return data
}

export async function getBorradoresHito(
  filtros: FiltrosBorradores = {}
): Promise<PaginatedResponse<BorradorFacturaItem>> {
  const { data } = await apiClient.get('/api/facturacion/borradores-hito/', {
    params: { page_size: 50, ...filtros },
  })
  return data
}

export async function sincronizarEntregas(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/sap/sync/entregas/')
  return data
}

export async function sincronizarBorradoresHito(): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/api/sap/sync/borradores-hito/')
  return data
}
