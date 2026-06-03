import { useQuery } from '@tanstack/react-query'
import {
  getOrdenes,
  getOrden,
  getLineasOV,
  getLineasPendientes,
  getResumenDashboard,
  type FiltrosLineas,
} from '@/api/ordenes'
import { QUERY_STALE_TIME } from '@/lib/constants'

export function useOrdenes(filtros: { estado?: string; search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['ordenes', filtros],
    queryFn: () => getOrdenes(filtros),
  })
}

export function useOrden(id: number) {
  return useQuery({
    queryKey: ['orden', id],
    queryFn: () => getOrden(id),
    enabled: id > 0,
  })
}

export function useLineasOV(id: number) {
  return useQuery({
    queryKey: ['lineas-ov', id],
    queryFn: () => getLineasOV(id),
    enabled: id > 0,
  })
}

export function useLineasPendientes(filtros: FiltrosLineas = {}) {
  return useQuery({
    queryKey: ['lineas-pendientes', filtros],
    queryFn: () => getLineasPendientes(filtros),
    // Refresca cada 5 minutos automáticamente
    staleTime: QUERY_STALE_TIME,
    refetchInterval: QUERY_STALE_TIME,
  })
}

export function useResumenDashboard() {
  return useQuery({
    queryKey: ['resumen-dashboard'],
    queryFn: getResumenDashboard,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: QUERY_STALE_TIME,
  })
}
