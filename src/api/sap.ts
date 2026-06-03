import apiClient from './client'
import type { SyncLog, SAPStatus } from '@/types'

export async function dispararSync(payload?: {
  fecha_desde?: string
  doc_entry?: number
}): Promise<SyncLog> {
  const { data } = await apiClient.post<SyncLog>('/api/sap/sync/', payload ?? {})
  return data
}

export async function getSyncLogs(): Promise<{ results: SyncLog[] }> {
  const { data } = await apiClient.get<{ results: SyncLog[] }>('/api/sap/sync/logs/')
  return data
}

export async function getEstadoSAP(): Promise<SAPStatus> {
  const { data } = await apiClient.get<SAPStatus>('/api/sap/status/')
  return data
}

export async function sincronizarLinea(lineaId: number): Promise<{ actualizada: boolean; duracion_segundos: number }> {
  const { data } = await apiClient.post(`/api/sap/sync/linea/${lineaId}/`)
  return data
}
