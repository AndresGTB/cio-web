import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw, Search, X, Warehouse,
  ChevronLeft, ChevronRight, Zap, AlertTriangle, CheckCircle,
  TrendingDown, PackageCheck, Package, List,
} from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { cn } from '@/lib/utils'
import { formatDecimal } from '@/lib/utils'
import { useStock } from '@/hooks/useInventario'
import { type FiltroRapidoStock } from '@/api/inventario'
import { distribuir } from '@/api/reservas'
import { useDebounce } from '@/hooks/useDebounce'
import type { StockItem } from '@/types'

// ------------------------------------------------------------------ //
// Toast
// ------------------------------------------------------------------ //

type ToastEstado = 'syncing' | 'ok' | 'error' | null

function SyncToast({ estado, mensaje, onClose }: { estado: ToastEstado; mensaje?: string; onClose: () => void }) {
  if (!estado) return null
  const map = {
    syncing: { bg: 'bg-[#0A1A28]', icon: <RefreshCw size={14} className="animate-spin text-white/50" />, msg: mensaje ?? 'Procesando...' },
    ok:      { bg: 'bg-semantic-success', icon: <CheckCircle size={14} className="text-white" />, msg: mensaje ?? 'Completado' },
    error:   { bg: 'bg-semantic-error',   icon: <AlertTriangle size={14} className="text-white" />, msg: mensaje ?? 'Error' },
  }
  const c = map[estado]
  return (
    <div className={cn('animate-fade-in fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-2xl ring-1 ring-black/10', c.bg)}>
      {c.icon}
      <span className="text-[13px] font-medium text-white">{c.msg}</span>
      {estado !== 'syncing' && (
        <button onClick={onClose} className="ml-1 text-white/50 hover:text-white"><X size={12} /></button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// KPI Card
// ------------------------------------------------------------------ //

function KpiCard({
  label, value, icon, color, delay = 0,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  delay?: number
}) {
  return (
    <div
      className="animate-kpi-in flex flex-1 items-center gap-3 rounded-[12px] border border-brand-alice-blue bg-white px-4 py-3 dark:border-white/[0.07] dark:bg-brand-dark-blue"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]', color)}>
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-steel-blue dark:text-white/30">
          {label}
        </p>
        <p className="mt-0.5 text-[18px] font-semibold tabular-nums leading-none text-brand-black dark:text-white">
          {typeof value === 'number' ? value.toLocaleString('es-CL') : value}
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Sliding filter tabs
// ------------------------------------------------------------------ //

const FILTROS: { key: FiltroRapidoStock; label: string }[] = [
  { key: 'todos',              label: 'Todos' },
  { key: 'con_stock',          label: 'Con stock' },
  { key: 'en_oc',              label: 'En OC' },
  { key: 'en_factura_reserva', label: 'En FR' },
  { key: 'pendiente_compra',   label: 'Pend. compra' },
]

function FilterTabs({ active, onChange }: { active: FiltroRapidoStock; onChange: (f: FiltroRapidoStock) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const idx = FILTROS.findIndex(f => f.key === active)
    const el = tabRefs.current[idx]
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }, [active])

  return (
    <div
      ref={containerRef}
      className="relative flex overflow-hidden rounded-[9px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue"
    >
      {/* Sliding pill */}
      <span
        className="absolute inset-y-0 rounded-[8px] bg-brand-black transition-all duration-200 dark:bg-white"
        style={{ left: pill.left, width: pill.width }}
      />
      {FILTROS.map(({ key, label }, i) => (
        <button
          key={key}
          ref={el => { tabRefs.current[i] = el }}
          onClick={() => onChange(key)}
          className={cn(
            'relative z-10 h-9 whitespace-nowrap px-3.5 text-[13px] font-medium transition-colors duration-200',
            i < FILTROS.length - 1 && 'border-r border-brand-alice-blue dark:border-white/10',
            active === key
              ? 'text-white dark:text-brand-black'
              : 'text-brand-blue-gray hover:text-brand-black dark:text-white/40 dark:hover:text-white',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Barra de cobertura animada
// ------------------------------------------------------------------ //

function CoverageBar({ total, resBodega, resFR, resTrans }: { total: number; resBodega: number; resFR: number; resTrans: number }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t) }, [])

  if (total <= 0)
    return <div className="h-[4px] w-full rounded-full bg-brand-alice-blue dark:bg-white/[0.06]" />

  const pBod   = ready ? Math.min(100, (resBodega / total) * 100) : 0
  const pFR    = ready ? Math.min(100, (resFR    / total) * 100) : 0
  const pTrans = ready ? Math.min(100, (resTrans  / total) * 100) : 0

  return (
    <div className="h-[4px] w-full overflow-hidden rounded-full bg-brand-alice-blue dark:bg-white/[0.06]">
      <div className="flex h-full">
        <div
          className="h-full bg-semantic-success"
          style={{ width: `${pBod}%`, transition: 'width 0.7s cubic-bezier(0,0,0.2,1)' }}
        />
        <div
          className="h-full bg-purple-500/70"
          style={{ width: `${pFR}%`, transition: 'width 0.7s cubic-bezier(0,0,0.2,1) 0.05s' }}
        />
        <div
          className="h-full bg-brand-blue/60"
          style={{ width: `${pTrans}%`, transition: 'width 0.7s cubic-bezier(0,0,0.2,1) 0.1s' }}
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Fila de stock
// ------------------------------------------------------------------ //

function StockRow({ item, index }: { item: StockItem; index: number }) {
  const onHand    = Number(item.on_hand)
  const enOC      = Number(item.qty_en_oc ?? 0)
  const enFR      = Number(item.qty_en_facturas_reserva ?? 0)
  const resBodega = Number(item.reservado_bodega)
  const resTrans  = Number(item.reservado_transito)
  const dispBodega = Number(item.disponible_bodega)
  const dispTrans  = Number(item.disponible_transito)
  const demanda    = Number(item.qty_demanda_pendiente ?? 0)
  const total      = onHand + enOC + enFR

  // Accent color por estado
  const accentColor =
    demanda > 0 && dispBodega === 0 && dispTrans === 0 ? '#E5031F'
    : dispBodega > 0                                    ? '#0FCD0F'
    : dispTrans  > 0                                    ? '#0002FB'
    : '#C8D6DF'

  return (
    <tr
      className="animate-row-in group border-b border-brand-alice-blue/60 transition-colors duration-150 hover:bg-[#f5f9fc] dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
      style={{
        animationDelay: `${Math.min(index * 25, 300)}ms`,
        boxShadow: `inset 3px 0 0 ${accentColor}`,
      }}
    >
      {/* SKU */}
      <td className="py-2.5 pl-5 pr-4">
        <p className="font-mono text-[12.5px] font-semibold tracking-tight text-brand-black dark:text-white">
          {item.sku}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-brand-steel-blue/70 dark:text-white/30" title={item.descripcion}>
          {item.descripcion || '—'}
        </p>
      </td>

      {/* On Hand */}
      <td className="px-4 py-2.5 text-right tabular-nums">
        <span className={cn(
          'text-[13px] font-semibold',
          onHand > 0 ? 'text-brand-black dark:text-white' : 'text-brand-alice-blue dark:text-white/15',
        )}>
          {formatDecimal(onHand, 0)}
        </span>
      </td>

      {/* En OC */}
      <td className="px-4 py-2.5 text-right tabular-nums">
        {enOC > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-brand-blue/8 px-2 py-0.5 text-[12px] font-medium text-brand-blue dark:bg-blue-400/15 dark:text-blue-400">
            {formatDecimal(enOC, 0)}
          </span>
        ) : (
          <span className="text-[13px] text-brand-alice-blue dark:text-white/15">—</span>
        )}
      </td>

      {/* Fac. Reserva */}
      <td className="px-4 py-2.5 text-right tabular-nums">
        {enFR > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-purple-500/10 px-2 py-0.5 text-[12px] font-medium text-purple-600 dark:bg-purple-400/15 dark:text-purple-400">
            {formatDecimal(enFR, 0)}
          </span>
        ) : (
          <span className="text-[13px] text-brand-alice-blue dark:text-white/15">—</span>
        )}
      </td>

      {/* Demanda */}
      <td className="px-4 py-2.5 text-right tabular-nums">
        {demanda > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-[6px] bg-semantic-error/8 px-2 py-0.5 text-[12px] font-medium text-semantic-error dark:bg-semantic-error/15">
            {formatDecimal(demanda, 0)}
          </span>
        ) : (
          <span className="text-[13px] text-brand-alice-blue dark:text-white/15">—</span>
        )}
      </td>

      {/* Cobertura */}
      <td className="px-4 py-2.5" style={{ minWidth: 120 }}>
        <CoverageBar total={total} resBodega={resBodega} resFR={enFR} resTrans={resTrans} />
        <div className="mt-1.5 flex items-center justify-between text-[10.5px] tabular-nums">
          <span className={cn(resBodega > 0 ? 'font-medium text-semantic-success' : 'text-brand-alice-blue dark:text-white/15')}>
            {formatDecimal(resBodega, 0)}
          </span>
          <span className={cn(resTrans > 0 ? 'font-medium text-brand-blue/70 dark:text-blue-400' : 'text-brand-alice-blue dark:text-white/15')}>
            +{formatDecimal(resTrans, 0)}
          </span>
        </div>
      </td>

      {/* Disponible */}
      <td className="py-2.5 pl-4 pr-5 text-right tabular-nums">
        <span className={cn(
          'text-[13px] font-semibold',
          dispBodega > 0 ? 'text-semantic-success' : 'text-brand-alice-blue dark:text-white/15',
        )}>
          {formatDecimal(dispBodega, 0)}
        </span>
        {dispTrans > 0 && (
          <p className="text-[10.5px] text-brand-blue/60 dark:text-blue-400">+{formatDecimal(dispTrans, 0)}</p>
        )}
      </td>
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function SkeletonRow({ index }: { index: number }) {
  return (
    <tr
      className="border-b border-brand-alice-blue/60 dark:border-white/[0.05]"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {[['pl-5 pr-4', 160], ['px-4', 56], ['px-4', 48], ['px-4', 48], ['px-4', 48], ['px-4', 120], ['pl-4 pr-5', 56]].map(([cls, w], i) => (
        <td key={i} className={cn('py-3', cls as string)}>
          <div
            className="h-3 animate-pulse rounded-[4px] bg-brand-alice-blue dark:bg-white/[0.06]"
            style={{ width: w as number, maxWidth: '100%' }}
          />
          {i === 0 && <div className="mt-1.5 h-2.5 w-24 animate-pulse rounded-[4px] bg-brand-alice-blue dark:bg-white/[0.04]" />}
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Página
// ------------------------------------------------------------------ //

const PAGE_SIZES = [15, 25, 50, 100]

export default function InventarioStock() {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda]       = useState('')
  const [pagina, setPagina]           = useState(1)
  const [pageSize, setPageSize]       = useState(15)
  const [filtroRapido, setFiltroRapido] = useState<FiltroRapidoStock>('todos')
  const [toast, setToast]             = useState<{ estado: ToastEstado; mensaje?: string }>({ estado: null })
  const [fifoDescartado, setFifoDescartado] = useState(false)
  const [elapsedFifo, setElapsedFifo] = useState(0)
  const fifoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtros = {
    ...(busquedaDebounced && { search: busquedaDebounced }),
    ...(filtroRapido === 'con_stock'          && { con_stock:          'true' as const }),
    ...(filtroRapido === 'en_oc'              && { en_oc:              'true' as const }),
    ...(filtroRapido === 'en_factura_reserva' && { en_factura_reserva: 'true' as const }),
    ...(filtroRapido === 'pendiente_compra'   && { pendiente_compra:   'true' as const }),
    page: pagina,
    page_size: pageSize,
  }

  const cambiarFiltro = useCallback((f: FiltroRapidoStock) => { setFiltroRapido(f); setPagina(1) }, [])
  const limpiar = useCallback(() => { setBusqueda(''); setPagina(1); setFiltroRapido('todos') }, [])

  const { data: stock, isLoading } = useStock(filtros)
  const totalPaginas = stock ? Math.ceil(stock.count / pageSize) : 0

  // KPIs calculados desde la página actual
  const kpis = useMemo(() => {
    if (!stock?.results) return null
    return {
      total:    stock.count,
      conStock: stock.results.filter(i => Number(i.on_hand) > 0).length,
      conDemanda: stock.results.filter(i => Number(i.qty_demanda_pendiente) > 0).length,
    }
  }, [stock])

  const showToast = (estado: ToastEstado, mensaje?: string) => {
    setToast({ estado, mensaje })
    if (estado !== 'syncing') setTimeout(() => setToast({ estado: null }), 4000)
  }

  const distribuirMutation = useMutation({
    mutationFn: () => distribuir(),
    onMutate: () => { setFifoDescartado(false); showToast('syncing', 'Ejecutando Motor FIFO...') },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['resumen-dashboard'] })
      showToast('ok', `FIFO · ${(data as Record<string,unknown>).skus_procesados ?? ''} SKUs`)
    },
    onError: () => showToast('error', 'Error en Motor FIFO'),
  })

  useEffect(() => {
    if (distribuirMutation.isPending && !fifoDescartado) {
      setElapsedFifo(0)
      fifoTimerRef.current = setInterval(() => setElapsedFifo((s) => s + 1), 1000)
    } else {
      if (fifoTimerRef.current) clearInterval(fifoTimerRef.current)
    }
    return () => { if (fifoTimerRef.current) clearInterval(fifoTimerRef.current) }
  }, [distribuirMutation.isPending, fifoDescartado])

  const fifoEnCurso = distribuirMutation.isPending && !fifoDescartado

  function formatElapsedFifo(s: number) {
    const m = Math.floor(s / 60)
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`
  }

  const algoPendiente = fifoEnCurso

  return (
    <div className="flex flex-col gap-5">
      <SyncToast estado={toast.estado} mensaje={toast.mensaje} onClose={() => setToast({ estado: null })} />

      {/* ── Header ── */}
      <div className="flex animate-fade-in items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-brand-black dark:text-white">
            Inventario de Stock
          </h2>
          <p className="mt-0.5 text-[13px] text-brand-steel-blue dark:text-white/35">
            BOD1011 · PRECISION_CHILE
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {fifoEnCurso && (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-brand-blue-gray dark:text-white/40">
                {formatElapsedFifo(elapsedFifo)}
              </span>
              {elapsedFifo >= 60 && (
                <button
                  onClick={() => setFifoDescartado(true)}
                  title="Descartar indicador (el FIFO sigue corriendo en el servidor)"
                  className="flex items-center gap-1 rounded-[6px] border border-brand-alice-blue bg-white px-2 py-0.5 text-[11px] text-brand-blue-gray transition-colors hover:border-semantic-error/40 hover:text-semantic-error dark:border-white/10 dark:bg-white/5 dark:text-white/40"
                >
                  <X size={10} />
                  Descartar
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => { setFifoDescartado(false); distribuirMutation.mutate() }}
            disabled={algoPendiente}
            className={cn(
              'flex h-9 items-center gap-2 rounded-[10px] px-4',
              'text-[13px] font-semibold text-white',
              'transition-all duration-200 active:scale-[0.98]',
              'disabled:cursor-not-allowed',
              fifoEnCurso
                ? 'bg-brand-blue-gray'
                : 'bg-brand-black hover:scale-[1.02] hover:opacity-90 disabled:opacity-40',
            )}
          >
            {fifoEnCurso
              ? <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
              : <Zap size={14} strokeWidth={2} />
            }
            {fifoEnCurso ? 'Distribuyendo…' : 'Distribuir FIFO'}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      {kpis && (
        <div className="flex gap-3">
          <KpiCard
            label="Total SKUs"
            value={kpis.total}
            icon={<Package size={16} strokeWidth={1.5} className="text-brand-steel-blue" />}
            color="bg-brand-alice-blue dark:bg-white/[0.06]"
            delay={0}
          />
          <KpiCard
            label="Con stock"
            value={kpis.conStock}
            icon={<PackageCheck size={16} strokeWidth={1.5} className="text-semantic-success" />}
            color="bg-semantic-success/10 dark:bg-semantic-success/10"
            delay={60}
          />
          <KpiCard
            label="Con demanda"
            value={kpis.conDemanda}
            icon={<TrendingDown size={16} strokeWidth={1.5} className="text-semantic-error" />}
            color="bg-semantic-error/10 dark:bg-semantic-error/10"
            delay={120}
          />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue/50" />
          <input
            type="text"
            placeholder="Buscar SKU o descripción…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            className={cn(
              'h-9 w-full rounded-[9px] border border-brand-alice-blue bg-white pl-8 pr-3',
              'text-[13px] text-brand-black outline-none placeholder:text-brand-steel-blue/35',
              'dark:border-white/10 dark:bg-brand-dark-blue dark:text-white dark:placeholder:text-white/20',
              'transition-colors duration-200 focus:border-brand-blue/40 dark:focus:border-brand-blue/30',
            )}
          />
        </div>

        <div className="h-5 w-px bg-brand-alice-blue dark:bg-white/10" />

        {/* Filtros con sliding pill */}
        <FilterTabs active={filtroRapido} onChange={cambiarFiltro} />

        {(busqueda || filtroRapido !== 'todos') && (
          <button
            onClick={limpiar}
            className="flex h-9 items-center gap-1.5 rounded-[9px] border border-brand-alice-blue bg-white px-3 text-[13px] text-brand-blue-gray transition-colors hover:border-semantic-error/40 hover:text-semantic-error dark:border-white/10 dark:bg-brand-dark-blue dark:text-white/40"
          >
            <X size={13} />
            Limpiar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          {!isLoading && stock && (
            <span className="animate-fade-in text-[12px] tabular-nums text-brand-steel-blue dark:text-white/30">
              {stock.count.toLocaleString('es-CL')} SKUs
            </span>
          )}
          <Select
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPagina(1) }}
            triggerIcon={<List size={13} strokeWidth={1.5} />}
            options={PAGE_SIZES.map(s => ({ value: String(s), label: String(s) }))}
          />
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-hidden rounded-[14px] border border-brand-alice-blue bg-white shadow-sm dark:border-white/[0.07] dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-brand-alice-blue dark:border-white/[0.07]">
                {['SKU', 'On Hand', 'En OC', 'Fac. Reserva', 'Demanda', 'Cobertura', 'Disponible'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'bg-[#f4f8fb] px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-widest text-brand-steel-blue',
                      'dark:bg-white/[0.03] dark:text-white/30',
                      i === 0 ? 'pl-5' : '',
                      i === 6 ? 'pr-5' : '',
                      i > 0 ? 'text-right' : '',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} index={i} />)}

              {!isLoading && stock?.results.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="animate-fade-in">
                      <Warehouse size={40} strokeWidth={1} className="mx-auto mb-4 text-brand-alice-blue dark:text-white/10" />
                      <p className="text-[14px] font-medium text-brand-blue-gray dark:text-white/40">Sin resultados</p>
                      <p className="mt-1.5 text-[12px] text-brand-steel-blue/50 dark:text-white/20">
                        {busqueda || filtroRapido !== 'todos'
                          ? 'Ningún SKU coincide con los filtros activos'
                          : 'Sincroniza el stock desde SAP para comenzar'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && stock?.results.map((item, i) => (
                <StockRow key={item.id} item={item} index={i} />
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Paginación ── */}
        {!isLoading && totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-brand-alice-blue px-5 py-2.5 dark:border-white/[0.07]">
            <span className="text-[12px] tabular-nums text-brand-steel-blue dark:text-white/30">
              {(pagina - 1) * pageSize + 1}–{Math.min(pagina * pageSize, stock?.count ?? 0)}
              {' '}de {(stock?.count ?? 0).toLocaleString('es-CL')}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-brand-alice-blue text-brand-steel-blue transition-all hover:border-brand-black hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-25 dark:border-white/10 dark:text-white/30"
              >
                <ChevronLeft size={14} />
              </button>
              {(() => {
                const ventana = Math.min(5, totalPaginas)
                const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - ventana + 1))
                return Array.from({ length: ventana }, (_, i) => inicio + i).map(p => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-[7px] text-[12px] font-medium transition-all duration-150',
                      p === pagina
                        ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black'
                        : 'border border-brand-alice-blue text-brand-steel-blue hover:border-brand-black hover:text-brand-black dark:border-white/10 dark:text-white/30',
                    )}
                  >
                    {p}
                  </button>
                ))
              })()}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-brand-alice-blue text-brand-steel-blue transition-all hover:border-brand-black hover:text-brand-black disabled:cursor-not-allowed disabled:opacity-25 dark:border-white/10 dark:text-white/30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Leyenda ── */}
      <div className="flex items-center gap-5 text-[11px] text-brand-steel-blue/50 dark:text-white/20">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-semantic-success" />Bodega disponible</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-purple-500/70" />Fact. Reserva</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand-blue/60" />En tránsito (OC)</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-semantic-error" />Sin cobertura</span>
      </div>
    </div>
  )
}
