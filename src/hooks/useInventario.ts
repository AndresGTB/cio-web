import { useQuery } from '@tanstack/react-query'
import { getStock, getOrdenesCompra, type FiltrosStock } from '@/api/inventario'
import { getReservas, getReservasPorLinea, type FiltrosReservas } from '@/api/reservas'
import { QUERY_STALE_TIME } from '@/lib/constants'

export function useStock(filtros: FiltrosStock = {}) {
  return useQuery({
    queryKey: ['stock', filtros],
    queryFn: () => getStock(filtros),
    staleTime: QUERY_STALE_TIME,
  })
}

export function useOrdenesCompra(filtros: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['ordenes-compra', filtros],
    queryFn: () => getOrdenesCompra(filtros),
    staleTime: QUERY_STALE_TIME,
  })
}

export function useReservas(filtros: FiltrosReservas = {}) {
  return useQuery({
    queryKey: ['reservas', filtros],
    queryFn: () => getReservas(filtros),
    staleTime: QUERY_STALE_TIME,
  })
}

export function useReservasPorLinea(lineaId: number) {
  return useQuery({
    queryKey: ['reservas-linea', lineaId],
    queryFn: () => getReservasPorLinea(lineaId),
    enabled: lineaId > 0,
    staleTime: 30_000,
  })
}
