import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFecha, formatDecimal } from '@/lib/utils'
import { useLineasPendientes, useResumenDashboard } from '@/hooks/useOrdenes'
import { useDebounce } from '@/hooks/useDebounce'
import { dispararSync, sincronizarLinea } from '@/api/sap'
import type { EstadoLinea, TipoFacturacion, LineaOVDetallada } from '@/types'
import DetalleLinea, { CoberturaBar } from '@/pages/DetalleLinea'

// ------------------------------------------------------------------ //
// Configuración de estados (badges y colores)
// ------------------------------------------------------------------ //

const ESTADO_CONFIG: Record<
  EstadoLinea,
  { label: string; className: string }
> = {
  SIN_PLANIFICACION: {
    label: 'Sin planif.',
    className: 'bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50',
  },
  ABIERTA: {
    label: 'Abierta',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  PARCIAL: {
    label: 'Parcial',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  RIESGO: {
    label: 'Riesgo',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  CUBIERTA: {
    label: 'Cubierta',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
}

// ------------------------------------------------------------------ //
// Configuración de tipo de facturación (badges)
// ------------------------------------------------------------------ //

const TIPO_FACTURACION_CONFIG: Record<TipoFacturacion, { label: string; className: string; title?: string }> = {
  ESTANDAR: {
    label: 'Estándar',
    className: 'bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50',
  },
  ANTICIPO: {
    label: 'Anticipo',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  HITO: {
    label: 'Hito',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  ERROR: {
    label: 'Error facturación',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    title: 'Hito y Anticipo marcados simultáneamente en SAP — corregir en origen',
  },
}

// ------------------------------------------------------------------ //
// Helpers de fecha con colores de urgencia
// ------------------------------------------------------------------ //

function clasificarFecha(fechaISO: string | null): 'vencida' | 'urgente' | 'normal' | 'sin-fecha' {
  if (!fechaISO) return 'sin-fecha'
  const diff = Math.ceil(
    (new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (diff < 0) return 'vencida'
  if (diff <= 7) return 'urgente'
  return 'normal'
}

function FechaCell({ fecha }: { fecha: string | null }) {
  const clase = clasificarFecha(fecha)
  const estilos = {
    vencida: 'text-semantic-error font-semibold',
    urgente: 'text-semantic-warning font-semibold',
    normal: 'text-brand-black dark:text-white',
    'sin-fecha': 'text-brand-blue-gray dark:text-white/40',
  }
  return (
    <span className={cn('text-[13px]', estilos[clase])}>
      {fecha ? formatFecha(fecha) : '—'}
      {clase === 'vencida' && (
        <span className="ml-1 text-[11px]">(vencida)</span>
      )}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Skeleton de tabla
// ------------------------------------------------------------------ //

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Toast de sincronización
// ------------------------------------------------------------------ //

function SyncToast({
  estado,
  onClose,
}: {
  estado: 'syncing' | 'ok' | 'error'
  onClose: () => void
}) {
  const config = {
    syncing: {
      bg: 'bg-brand-black',
      icon: <RefreshCw size={16} className="animate-spin text-brand-aquamarine" />,
      msg: 'Sincronizando con SAP Business One...',
    },
    ok: {
      bg: 'bg-semantic-success',
      icon: <CheckCircle size={16} className="text-white" />,
      msg: 'Sincronización completada',
    },
    error: {
      bg: 'bg-semantic-error',
      icon: <AlertTriangle size={16} className="text-white" />,
      msg: 'Error al sincronizar con SAP',
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
        <button
          onClick={onClose}
          className="ml-2 text-white/70 hover:text-white"
          aria-label="Cerrar notificación"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Tarjeta de métrica
// ------------------------------------------------------------------ //

interface MetricaProps {
  label: string
  valor: number | string
  icon: React.ElementType
  color: string
  loading?: boolean
}

function MetricaCard({ label, valor, icon: Icon, color, loading }: MetricaProps) {
  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', color)}>
        <Icon size={20} strokeWidth={1} />
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
          {label}
        </p>
        {loading ? (
          <div className="mt-1 h-6 w-16 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        ) : (
          <p className="text-[24px] font-semibold leading-tight text-brand-black dark:text-white">
            {valor}
          </p>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Componente principal
// ------------------------------------------------------------------ //

export default function MonitorNegocios() {
  const queryClient = useQueryClient()

  // Estado de filtros
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<EstadoLinea | ''>('')
  const [bodega, setBodega] = useState('')
  const [pagina, setPagina] = useState(1)
  const [toastEstado, setToastEstado] = useState<'syncing' | 'ok' | 'error' | null>(null)
  const [lineaDetalle, setLineaDetalle] = useState<LineaOVDetallada | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)

  // Queries
  const filtros = {
    ...(estado && { estado }),
    ...(bodega && { bodega }),
    ...(busquedaDebounced && { search: busquedaDebounced }),
    page: pagina,
    page_size: 50,
  }

  const { data: lineas, isLoading: cargandoLineas } = useLineasPendientes(filtros)
  const { data: resumen, isLoading: cargandoResumen } = useResumenDashboard()

  // Mutación de sincronización
  const syncMutation = useMutation({
    mutationFn: dispararSync,
    onMutate: () => setToastEstado('syncing'),
    onSuccess: () => {
      setToastEstado('ok')
      queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
      queryClient.invalidateQueries({ queryKey: ['resumen-dashboard'] })
      setTimeout(() => setToastEstado(null), 4000)
    },
    onError: () => {
      setToastEstado('error')
      setTimeout(() => setToastEstado(null), 5000)
    },
  })

  const limpiarFiltros = useCallback(() => {
    setBusqueda('')
    setEstado('')
    setBodega('')
    setPagina(1)
  }, [])

  const hayFiltros = busqueda || estado || bodega

  const totalPaginas = lineas ? Math.ceil(lineas.count / 50) : 0

  const formatearMoneda = (valor: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(valor)

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toastEstado && (
        <SyncToast estado={toastEstado} onClose={() => setToastEstado(null)} />
      )}

      {/* Sheet de detalle */}
      <DetalleLinea linea={lineaDetalle} onClose={() => setLineaDetalle(null)} />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
            Monitor de Negocios
          </h2>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            Líneas de OV pendientes de despacho — sincronizadas desde SAP Business One
            {resumen?.ultimo_sync && (
              <span className="ml-2 text-[12px]">
                · Último sync: {formatFecha(resumen.ultimo_sync)}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => syncMutation.mutate({})}
          disabled={syncMutation.isPending}
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-[10px] px-4 text-[14px] font-semibold text-white',
            'bg-brand-black transition-all duration-400 ease-out',
            'hover:bg-brand-blue-gray active:scale-[0.98]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <RefreshCw
            size={16}
            strokeWidth={2}
            className={syncMutation.isPending ? 'animate-spin' : ''}
          />
          Sincronizar SAP
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricaCard
          label="Total Pendientes"
          valor={resumen?.total_lineas_abiertas ?? 0}
          icon={Package}
          color="bg-brand-blue/10 text-brand-blue"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="Sin Planificación"
          valor={resumen?.lineas_sin_planificacion ?? 0}
          icon={Clock}
          color="bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="En Riesgo"
          valor={resumen?.lineas_en_riesgo ?? 0}
          icon={AlertTriangle}
          color="bg-semantic-error/10 text-semantic-error"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="Parcialmente Cubiertas"
          valor={resumen?.lineas_parciales ?? 0}
          icon={CheckCircle}
          color="bg-brand-blue/10 text-brand-blue"
          loading={cargandoResumen}
        />
        <div className="col-span-2 flex items-center gap-4 rounded-[16px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue lg:col-span-1">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
              Valor Pendiente
            </p>
            {cargandoResumen ? (
              <div className="mt-1 h-6 w-24 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
            ) : (
              <p className="text-[16px] font-semibold leading-tight text-brand-black dark:text-white">
                {formatearMoneda(resumen?.total_open_qty_valor ?? 0)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Buscar OV, SKU, cliente, descripción..."
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

        {/* Filtro estado */}
        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value as EstadoLinea | ''); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3 text-[14px] font-light',
            'bg-white text-brand-black outline-none',
            'dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'transition-all duration-400 focus:border-[#73B8EF]'
          )}
        >
          <option value="">Todos los estados</option>
          <option value="SIN_PLANIFICACION">Sin planificación</option>
          <option value="PARCIAL">Parcial</option>
          <option value="RIESGO">En riesgo</option>
          <option value="ABIERTA">Abierta</option>
        </select>

        {/* Filtro bodega */}
        <select
          value={bodega}
          onChange={(e) => { setBodega(e.target.value); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3 text-[14px] font-light',
            'bg-white text-brand-black outline-none',
            'dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'transition-all duration-400 focus:border-[#73B8EF]'
          )}
        >
          <option value="">Todas las bodegas</option>
          {resumen?.bodegas?.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Limpiar filtros */}
        {hayFiltros && (
          <button
            onClick={limpiarFiltros}
            className={cn(
              'flex h-10 items-center gap-1.5 rounded-[10px] border border-brand-alice-blue px-3',
              'text-[13px] font-medium text-brand-blue-gray',
              'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white/50',
              'transition-all duration-400 hover:border-semantic-error/40 hover:text-semantic-error',
            )}
          >
            <X size={14} />
            Limpiar
          </button>
        )}

        {/* Contador */}
        {!cargandoLineas && lineas && (
          <span className="ml-auto text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {lineas.count.toLocaleString('es-CL')} líneas
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {[
                  'N° OV', 'Cliente', 'SKU / Descripción', 'Bodega',
                  'Pendiente / Cobertura', 'Precio Unit.', 'F. Compromiso',
                  'Facturación', 'Estado', ''
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
              {cargandoLineas &&
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              }

              {!cargandoLineas && lineas?.results.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Package size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin líneas pendientes</p>
                    <p className="mt-1 text-[13px] font-light">
                      {hayFiltros
                        ? 'Ninguna línea coincide con los filtros actuales'
                        : 'Sincroniza con SAP para ver las líneas pendientes'}
                    </p>
                  </td>
                </tr>
              )}

              {!cargandoLineas &&
                lineas?.results.map((linea) => (
                  <LineasRow key={linea.id} linea={linea} onVerDetalle={() => setLineaDetalle(linea)} />
                ))
              }
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!cargandoLineas && totalPaginas > 1 && (
          <div className="flex items-center justify-between border-t border-brand-alice-blue px-4 py-3 dark:border-white/10">
            <p className="text-[13px] font-light text-brand-blue-gray dark:text-white/40">
              Página {pagina} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] border border-brand-alice-blue',
                  'text-brand-blue-gray transition-all duration-400 dark:border-white/10 dark:text-white/40',
                  'hover:border-brand-black hover:text-brand-black dark:hover:border-white/30 dark:hover:text-white',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Páginas numeradas — ventana deslizante de máx 5 */}
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
                  'hover:border-brand-black hover:text-brand-black dark:hover:border-white/30 dark:hover:text-white',
                  'disabled:cursor-not-allowed disabled:opacity-40'
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

// ------------------------------------------------------------------ //
// Formateador de precio multi-moneda (maneja UF, UTM y otros no-ISO)
// ------------------------------------------------------------------ //

const MONEDAS_ISO = new Set(['CLP', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'ARS', 'PEN', 'BRL', 'MXN'])

function formatPrecio(valor: number, moneda: string): string {
  if (MONEDAS_ISO.has(moneda)) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: moneda === 'CLP' ? 0 : 2,
    }).format(valor)
  }
  // UF, UTM y otras unidades chilenas no-ISO
  return `${moneda} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}`
}

// ------------------------------------------------------------------ //
// Fila de tabla — separada para evitar re-renders masivos
// ------------------------------------------------------------------ //

function LineasRow({ linea, onVerDetalle }: { linea: LineaOVDetallada; onVerDetalle: () => void }) {
  const queryClient = useQueryClient()
  const estado = ESTADO_CONFIG[linea.estado] ?? ESTADO_CONFIG.SIN_PLANIFICACION
  const tipoFact = TIPO_FACTURACION_CONFIG[linea.tipo_facturacion] ?? TIPO_FACTURACION_CONFIG.ESTANDAR
  const fechaEfectiva = linea.fecha_compromiso_linea ?? linea.fecha_compromiso_ov

  const syncLinea = useMutation({
    mutationKey: ['sync-linea', linea.id],
    mutationFn: () => sincronizarLinea(linea.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
    },
  })

  const sincronizando = syncLinea.isPending

  return (
    <tr className="border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <span className="font-medium text-brand-black dark:text-white">{linea.numero_ov}</span>
        <br />
        <span className="text-[11px] text-brand-steel-blue dark:text-white/40">
          Línea {linea.numero_linea}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-brand-black dark:text-white">{linea.cliente_nombre}</span>
        <br />
        <span className="text-[11px] text-brand-steel-blue dark:text-white/40">{linea.cliente_id}</span>
      </td>

      <td className="px-4 py-3 max-w-[200px]">
        <span className="font-medium text-brand-black dark:text-white">{linea.sku}</span>
        <br />
        <span
          className="text-[12px] text-brand-blue-gray dark:text-white/50 truncate block"
          title={linea.descripcion}
        >
          {linea.descripcion}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="rounded-[8px] bg-brand-alice-blue px-2 py-0.5 text-[12px] font-medium text-brand-steel-blue dark:bg-white/10 dark:text-white/60">
          {linea.bodega || '—'}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1 tabular-nums">
            <span className="text-[13px] font-semibold text-brand-black dark:text-white">
              {formatDecimal(Number(linea.open_qty_sap ?? linea.cantidad_pendiente), 0)}
            </span>
            <span className="text-[11px] text-brand-steel-blue dark:text-white/40">
              {linea.unidad}
            </span>
          </div>
          <CoberturaBar
            openQty={Number(linea.open_qty_sap ?? linea.cantidad_pendiente ?? 0)}
            qtyBodega={Number(linea.qty_bodega ?? 0)}
            qtyTransito={Number(linea.qty_transito ?? 0)}
            qtyPendiente={Number(linea.qty_pendiente_compra ?? 0)}
            unidad={linea.unidad}
          />
        </div>
      </td>

      <td className="px-4 py-3 tabular-nums text-right">
        {linea.precio_unitario ? (
          <span className="text-brand-black dark:text-white">
            {formatPrecio(Number(linea.precio_unitario), linea.moneda || 'CLP')}
          </span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <FechaCell fecha={fechaEfectiva} />
      </td>

      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium',
            tipoFact.className
          )}
          title={tipoFact.title}
        >
          {tipoFact.label}
        </span>
      </td>

      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium',
            estado.className
          )}
        >
          {estado.label}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => syncLinea.mutate()}
            disabled={sincronizando}
            aria-label="Sincronizar línea con SAP"
            title="Sincronizar con SAP"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[8px] text-brand-steel-blue',
              'transition-all duration-400 hover:bg-brand-blue/10 hover:text-brand-blue',
              'dark:hover:bg-brand-blue/20 dark:hover:text-brand-blue',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue',
              'disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={sincronizando ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onVerDetalle}
            aria-label="Ver detalle OV"
            title="Ver detalle"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[8px] text-brand-steel-blue',
              'transition-all duration-400 hover:bg-brand-alice-blue hover:text-brand-black',
              'dark:hover:bg-white/10 dark:hover:text-white',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue'
            )}
          >
            <Eye size={14} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  )
}
