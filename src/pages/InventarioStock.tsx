import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  Search,
  X,
  Warehouse,
  Ship,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDecimal, formatFecha } from '@/lib/utils'
import { useStock } from '@/hooks/useInventario'
import { sincronizarStock, sincronizarOrdenesCompra } from '@/api/inventario'
import { distribuir } from '@/api/reservas'
import { useDebounce } from '@/hooks/useDebounce'
import type { StockItem } from '@/types'

// ------------------------------------------------------------------ //
// Toast reutilizable
// ------------------------------------------------------------------ //

type ToastEstado = 'syncing' | 'ok' | 'error' | null

function SyncToast({ estado, mensaje, onClose }: { estado: ToastEstado; mensaje?: string; onClose: () => void }) {
  if (!estado) return null
  const config = {
    syncing: {
      bg: 'bg-brand-black',
      icon: <RefreshCw size={16} className="animate-spin text-brand-aquamarine" />,
      msg: mensaje ?? 'Procesando...',
    },
    ok: {
      bg: 'bg-semantic-success',
      icon: <CheckCircle size={16} className="text-white" />,
      msg: mensaje ?? 'Completado',
    },
    error: {
      bg: 'bg-semantic-error',
      icon: <AlertTriangle size={16} className="text-white" />,
      msg: mensaje ?? 'Error al procesar',
    },
  }
  const c = config[estado]
  return (
    <div
      className={cn(
        'animate-fade-in fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[10px] px-4 py-3 shadow-xl',
        c.bg
      )}
    >
      {c.icon}
      <span className="text-[14px] font-medium text-white">{c.msg}</span>
      {estado !== 'syncing' && (
        <button onClick={onClose} className="ml-2 text-white/70 hover:text-white" aria-label="Cerrar">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Barra de uso de stock por fila
// ------------------------------------------------------------------ //

function UsageBar({ onHand, reservadoBodega, reservadoTransito }: { onHand: number; reservadoBodega: number; reservadoTransito: number }) {
  const total = onHand
  if (total <= 0) return <div className="h-1.5 w-full rounded-full bg-brand-alice-blue dark:bg-white/10" />
  const pBod = Math.min(100, (reservadoBodega / total) * 100)
  const pTrans = Math.min(100, (reservadoTransito / total) * 100)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-alice-blue dark:bg-white/10">
      <div className="flex h-full">
        {pBod > 0 && <div className="h-full bg-semantic-success" style={{ width: `${pBod}%` }} />}
        {pTrans > 0 && <div className="h-full bg-brand-blue" style={{ width: `${pTrans}%` }} />}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Fila de stock
// ------------------------------------------------------------------ //

function StockRow({ item }: { item: StockItem }) {
  const onHand = Number(item.on_hand)
  const resBodega = Number(item.reservado_bodega)
  const resTrans = Number(item.reservado_transito)
  const dispBodega = Number(item.disponible_bodega)
  const dispTrans = Number(item.disponible_transito)
  const enOC = Number(item.qty_en_oc ?? 0)
  const demandaPendiente = Number(item.qty_demanda_pendiente ?? 0)

  return (
    <tr className="border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <span className="font-medium text-brand-black dark:text-white">{item.sku}</span>
        <br />
        <span className="text-[11px] text-brand-steel-blue dark:text-white/40" title={item.descripcion}>
          {item.descripcion.length > 40 ? item.descripcion.slice(0, 40) + '…' : item.descripcion}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="rounded-[8px] bg-brand-alice-blue px-2 py-0.5 text-[12px] font-medium text-brand-steel-blue dark:bg-white/10 dark:text-white/60">
          {item.bodega_codigo}
        </span>
      </td>

      <td className="px-4 py-3 tabular-nums text-right">
        <span className="text-[14px] font-semibold text-brand-black dark:text-white">
          {formatDecimal(onHand, 0)}
        </span>
      </td>

      <td className="px-4 py-3 tabular-nums text-right">
        <span className={cn('text-[13px] font-medium', enOC > 0 ? 'text-brand-blue' : 'text-brand-blue-gray')}>
          {formatDecimal(enOC, 0)}
        </span>
      </td>

      <td className="px-4 py-3 tabular-nums text-right">
        <span className={cn('text-[13px] font-medium', demandaPendiente > 0 ? 'text-semantic-error' : 'text-brand-blue-gray')}>
          {formatDecimal(demandaPendiente, 0)}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="flex justify-between tabular-nums text-[12px]">
            <span className="flex items-center gap-1 text-semantic-success">
              <Warehouse size={11} strokeWidth={1.5} />
              {formatDecimal(resBodega, 0)}
            </span>
            <span className="flex items-center gap-1 text-brand-blue">
              <Ship size={11} strokeWidth={1.5} />
              {formatDecimal(resTrans, 0)}
            </span>
          </div>
          <UsageBar onHand={onHand + enOC} reservadoBodega={resBodega} reservadoTransito={resTrans} />
        </div>
      </td>

      <td className="px-4 py-3 tabular-nums text-right">
        <span className={cn('text-[13px] font-medium', dispBodega > 0 ? 'text-semantic-success' : 'text-brand-blue-gray')}>
          {formatDecimal(dispBodega, 0)}
        </span>
        <br />
        <span className={cn('text-[11px]', dispTrans > 0 ? 'text-brand-blue' : 'text-brand-blue-gray')}>
          +{formatDecimal(dispTrans, 0)} tráns.
        </span>
      </td>

      <td className="px-4 py-3 text-[11px] text-brand-steel-blue dark:text-white/40 whitespace-nowrap">
        {item.ultimo_sync_sap ? formatFecha(item.ultimo_sync_sap) : '—'}
      </td>
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Página principal
// ------------------------------------------------------------------ //

const PAGE_SIZES = [10, 15, 25, 50]

export default function InventarioStock() {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [toast, setToast] = useState<{ estado: ToastEstado; mensaje?: string }>({ estado: null })

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtros = {
    ...(busquedaDebounced && { search: busquedaDebounced }),
    page: pagina,
    page_size: pageSize,
  }

  const { data: stock, isLoading } = useStock(filtros)

  const limpiarFiltros = useCallback(() => { setBusqueda(''); setPagina(1) }, [])
  const totalPaginas = stock ? Math.ceil(stock.count / pageSize) : 0

  const showToast = (estado: ToastEstado, mensaje?: string) => {
    setToast({ estado, mensaje })
    if (estado !== 'syncing') setTimeout(() => setToast({ estado: null }), 4000)
  }

  const syncStockMutation = useMutation({
    mutationFn: () => sincronizarStock(),
    onMutate: () => showToast('syncing', 'Sincronizando stock desde SAP...'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      const d = data as Record<string, unknown>
      showToast('ok', `Stock actualizado · ${d.items_actualizados ?? ''} SKUs`)
    },
    onError: () => showToast('error', 'Error al sincronizar stock'),
  })

  const syncOCMutation = useMutation({
    mutationFn: () => sincronizarOrdenesCompra(),
    onMutate: () => showToast('syncing', 'Sincronizando órdenes de compra...'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra'] })
      showToast('ok', 'Órdenes de compra actualizadas')
    },
    onError: () => showToast('error', 'Error al sincronizar OC'),
  })

  const distribuirMutation = useMutation({
    mutationFn: () => distribuir(),
    onMutate: () => showToast('syncing', 'Ejecutando Motor FIFO...'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['resumen-dashboard'] })
      const d = data as Record<string, unknown>
      showToast('ok', `FIFO completado · ${d.skus_procesados ?? ''} SKUs`)
    },
    onError: () => showToast('error', 'Error en Motor FIFO'),
  })

  const algoPendiente = syncStockMutation.isPending || syncOCMutation.isPending || distribuirMutation.isPending

  return (
    <div className="flex flex-col gap-6">
      <SyncToast
        estado={toast.estado}
        mensaje={toast.mensaje}
        onClose={() => setToast({ estado: null })}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
            Inventario de Stock
          </h2>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            Stock por SKU y bodega sincronizado desde SAP Business One
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => syncStockMutation.mutate()}
            disabled={algoPendiente}
            title="Sincronizar stock desde SAP"
            className={cn(
              'flex h-10 items-center gap-2 rounded-[10px] border border-brand-alice-blue px-3',
              'bg-white text-[13px] font-medium text-brand-black',
              'dark:border-white/10 dark:bg-transparent dark:text-white',
              'transition-all duration-400 hover:border-brand-black hover:bg-brand-alice-blue/50',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Warehouse size={15} strokeWidth={1.5} className={syncStockMutation.isPending ? 'animate-pulse' : ''} />
            Stock
          </button>

          <button
            onClick={() => syncOCMutation.mutate()}
            disabled={algoPendiente}
            title="Sincronizar órdenes de compra desde SAP"
            className={cn(
              'flex h-10 items-center gap-2 rounded-[10px] border border-brand-alice-blue px-3',
              'bg-white text-[13px] font-medium text-brand-black',
              'dark:border-white/10 dark:bg-transparent dark:text-white',
              'transition-all duration-400 hover:border-brand-black hover:bg-brand-alice-blue/50',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <ShoppingCart size={15} strokeWidth={1.5} className={syncOCMutation.isPending ? 'animate-pulse' : ''} />
            OC
          </button>

          <button
            onClick={() => distribuirMutation.mutate()}
            disabled={algoPendiente}
            title="Ejecutar Motor FIFO — redistribuir reservas"
            className={cn(
              'flex h-10 items-center gap-2 rounded-[10px] px-4',
              'bg-brand-black text-[13px] font-semibold text-white',
              'transition-all duration-400 hover:bg-brand-dark-blue',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Zap
              size={15}
              strokeWidth={2}
              className={distribuirMutation.isPending ? 'animate-pulse' : ''}
            />
            Distribuir FIFO
          </button>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="flex flex-wrap gap-4 text-[12px] font-light text-brand-blue-gray dark:text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-semantic-success" />
          Reservado bodega
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />
          Reservado tránsito / OC
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-alice-blue dark:bg-white/20" />
          Disponible (libre)
        </span>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar SKU o descripción..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            className={cn(
              'h-10 w-full rounded-[10px] border border-brand-alice-blue pl-9 pr-4',
              'text-[14px] font-light text-brand-black outline-none',
              'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
              'transition-all duration-400 focus:border-[#73B8EF]',
              'placeholder:text-brand-steel-blue/60'
            )}
          />
        </div>

        {busqueda && (
          <button
            onClick={limpiarFiltros}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-[10px] border border-brand-alice-blue px-3',
              'text-[13px] font-medium text-brand-blue-gray',
              'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white/50',
              'transition-all duration-400 hover:border-semantic-error/40 hover:text-semantic-error'
            )}
          >
            <X size={14} />
            Limpiar
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          {!isLoading && stock && (
            <span className="text-[13px] font-light text-brand-blue-gray dark:text-white/40">
              {stock.count.toLocaleString('es-CL')} SKUs
            </span>
          )}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPagina(1) }}
            className={cn(
              'h-10 rounded-[10px] border border-brand-alice-blue px-3 pr-8',
              'text-[13px] font-medium text-brand-black bg-white',
              'dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
              'cursor-pointer outline-none transition-all duration-400 focus:border-[#73B8EF]'
            )}
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} / pág.</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {[
                  'SKU / Descripción', 'Bodega', 'On Hand', 'En OC (tránsito)',
                  'Pend. Compra', 'Reservado (bod. / tráns.)', 'Disponible', 'Último sync'
                ].map((h) => (
                  <th
                    key={h}
                    className="bg-brand-alice-blue/50 px-4 py-3 font-medium text-brand-blue-gray dark:bg-white/5 dark:text-white/50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && stock?.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Warehouse size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin stock sincronizado</p>
                    <p className="mt-1 text-[13px] font-light">
                      {busqueda
                        ? 'Ningún SKU coincide con la búsqueda'
                        : 'Sincroniza el stock desde SAP para comenzar'}
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && stock?.results.map((item) => (
                <StockRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!isLoading && totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-brand-alice-blue px-4 py-3 dark:border-white/10">
            <p className="text-[13px] font-light text-brand-blue-gray dark:text-white/40">
              {(() => {
                const desde = (pagina - 1) * pageSize + 1
                const hasta = Math.min(pagina * pageSize, stock?.count ?? 0)
                return `${desde}–${hasta} de ${(stock?.count ?? 0).toLocaleString('es-CL')}`
              })()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] border border-brand-alice-blue',
                  'text-brand-blue-gray transition-all duration-400 dark:border-white/10 dark:text-white/40',
                  'hover:border-brand-black hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                <ChevronLeft size={16} />
              </button>
              {(() => {
                const ventana = Math.min(5, totalPaginas)
                const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - ventana + 1))
                return Array.from({ length: ventana }, (_, i) => inicio + i).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-[8px] text-[13px] font-medium transition-all duration-400',
                      p === pagina
                        ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black'
                        : 'border border-brand-alice-blue text-brand-blue-gray hover:border-brand-black hover:text-brand-black dark:border-white/10 dark:text-white/40'
                    )}
                  >
                    {p}
                  </button>
                ))
              })()}
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] border border-brand-alice-blue',
                  'text-brand-blue-gray transition-all duration-400 dark:border-white/10 dark:text-white/40',
                  'hover:border-brand-black hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
