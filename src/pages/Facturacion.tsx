import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Lock,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { QUERY_STALE_TIME } from '@/lib/constants'
import {
  getPipeline,
  getPipelineDetalle,
  getResumenFacturacion,
  getProyeccionFacturacion,
  calcularPipeline,
} from '@/api/facturacion'
import type {
  EstadoFacturable,
  MotivoBloqueo,
  ResumenFacturacion,
} from '@/types'

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function formatCLP(v: number | string | null | undefined): string {
  if (v == null) return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatFecha(f: string | null | undefined): string {
  if (!f) return '—'
  return new Date(f + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function nombreMes(mes: string): string {
  const [year, month] = mes.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('es-CL', {
    month: 'short',
    year: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const ESTADO_CONFIG: Record<EstadoFacturable, { label: string; cls: string }> = {
  FACTURABLE_HOY:    { label: 'Facturable hoy',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  FACTURABLE_FUTURO: { label: 'Futuro',            cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  BLOQUEADO:         { label: 'Bloqueado',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  FACTURADO:         { label: 'Facturado',         cls: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/40' },
  NO_APLICA:         { label: 'No aplica',         cls: 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/30' },
}

const TIPO_OV_CONFIG: Record<string, { label: string; cls: string }> = {
  ANTICIPO: { label: 'Anticipo',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  HITO:     { label: 'Hito',     cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  ESTANDAR: { label: 'Estándar', cls: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/50' },
}

const MOTIVO_ACCION: Record<MotivoBloqueo, string> = {
  SIN_ENTREGA:        'Verificar despacho en SAP',
  ENTREGA_PARCIAL:    'Completar despacho pendiente',
  HITO_NO_VENCIDO:    'Esperar fecha de vencimiento del hito',
  HITO_SIN_BORRADOR:  'Crear borrador de factura en SAP',
  ANTICIPO_PENDIENTE: 'Gestionar cobro del anticipo',
  SIN_COBERTURA:      'Ver sugerencias de compra',
  OTRO:               'Revisar con el equipo de finanzas',
}

function BadgeEstado({ estado }: { estado: EstadoFacturable }) {
  const c = ESTADO_CONFIG[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', c.cls)}>
      {c.label}
    </span>
  )
}

function BadgeTipoOV({ tipo }: { tipo: string }) {
  const c = TIPO_OV_CONFIG[tipo] ?? { label: tipo, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', c.cls)}>
      {c.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Paginación
// ---------------------------------------------------------------------------

function Paginacion({
  pagina,
  totalPaginas,
  onChange,
}: {
  pagina: number
  totalPaginas: number
  onChange: (p: number) => void
}) {
  if (totalPaginas <= 1) return null
  const ventana = Math.min(5, totalPaginas)
  const inicio  = Math.max(1, Math.min(pagina - 2, totalPaginas - ventana + 1))
  const paginas = Array.from({ length: ventana }, (_, i) => inicio + i)

  return (
    <div className="flex items-center justify-between border-t border-brand-alice-blue px-4 py-3 dark:border-white/10">
      <p className="text-[13px] font-light text-brand-blue-gray dark:text-white/40">
        Página {pagina} de {totalPaginas}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, pagina - 1))}
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
        {paginas.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-[8px] text-[13px] font-medium transition-all duration-400',
              p === pagina
                ? 'bg-brand-black text-white dark:bg-white dark:text-brand-black'
                : 'border border-brand-alice-blue text-brand-blue-gray hover:border-brand-black hover:text-brand-black dark:border-white/10 dark:text-white/40'
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPaginas, pagina + 1))}
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
  )
}

// ---------------------------------------------------------------------------
// Panel lateral (detalle de ítem)
// ---------------------------------------------------------------------------

function PanelLateral({
  itemId,
  onClose,
}: {
  itemId: number | null
  onClose: () => void
}) {
  const { data: item, isLoading } = useQuery({
    queryKey: ['pipeline-detalle', itemId],
    queryFn:  () => getPipelineDetalle(itemId!),
    enabled:  itemId != null,
    staleTime: QUERY_STALE_TIME,
  })

  if (itemId == null) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col overflow-y-auto bg-white shadow-2xl dark:bg-brand-dark-blue">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-alice-blue px-6 py-4 dark:border-white/10">
          <div>
            <p className="text-[15px] font-semibold text-brand-black dark:text-white">
              Detalle del ítem
            </p>
            {item && (
              <p className="text-[12px] text-brand-blue-gray dark:text-white/50">
                OV {item.numero_ov} · {item.cliente_nombre}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-brand-blue-gray hover:bg-brand-alice-blue dark:text-white/40 dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          </div>
        )}

        {item && !isLoading && (
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Estado y tipo */}
            <div className="flex flex-wrap gap-2">
              <BadgeTipoOV tipo={item.tipo_ov} />
              <BadgeEstado estado={item.estado_facturable} />
              <span className="inline-flex rounded-full bg-brand-alice-blue px-2 py-0.5 text-[11px] font-medium text-brand-blue-gray dark:bg-white/5 dark:text-white/50">
                {item.tipo_documento.replace('_', ' ')}
              </span>
            </div>

            {/* Monto */}
            <div className="rounded-[12px] border border-brand-alice-blue p-4 dark:border-white/10">
              <p className="text-[12px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
                Monto Facturable
              </p>
              <p className="mt-1 text-[28px] font-semibold text-brand-black dark:text-white">
                {formatCLP(item.monto_facturable)}
              </p>
              <p className="mt-1 text-[13px] text-brand-blue-gray dark:text-white/40">
                Fecha facturable: {formatFecha(item.fecha_facturable)}
              </p>
            </div>

            {/* Detalle según tipo OV */}
            {item.tipo_ov === 'ESTANDAR' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-brand-black dark:text-white">
                  Información de la línea
                </p>
                <Row label="SKU"           value={item.linea_ov_sku ?? item.sku ?? '—'} />
                <Row label="Descripción"   value={item.linea_ov_descripcion ?? item.descripcion ?? '—'} />
                <Row label="Cantidad pend." value={item.linea_ov_cantidad ?? '—'} />
                <Row label="Stock bodega"  value={item.linea_ov_qty_bodega ?? '—'} />
                <Row label="Precio unit."  value={item.linea_ov_precio ? formatCLP(item.linea_ov_precio) : '—'} />
                {item.entrega_numero && (
                  <>
                    <p className="mt-2 text-[13px] font-semibold text-brand-black dark:text-white">
                      Entrega asociada
                    </p>
                    <Row label="N° Entrega"   value={item.entrega_numero} />
                    <Row label="Fecha entrega" value={formatFecha(item.entrega_fecha)} />
                  </>
                )}
              </div>
            )}

            {item.tipo_ov === 'HITO' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-brand-black dark:text-white">
                  Hito
                </p>
                <Row label="Monto hito"       value={formatCLP(item.borrador_monto)} />
                <Row label="Fecha vencimiento" value={formatFecha(item.borrador_fecha)} />
                <Row label="Fecha compromiso"  value={formatFecha(item.fecha_compromiso)} />
              </div>
            )}

            {item.tipo_ov === 'ANTICIPO' && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-brand-black dark:text-white">
                  {item.tipo_documento === 'ANTICIPO' ? 'Factura Anticipo' : 'Guía No Facturable'}
                </p>
                {item.entrega_numero && (
                  <>
                    <Row label="N° Entrega"    value={item.entrega_numero} />
                    <Row label="Fecha entrega" value={formatFecha(item.entrega_fecha)} />
                  </>
                )}
                <Row label="Fecha compromiso" value={formatFecha(item.fecha_compromiso)} />
              </div>
            )}

            {/* Bloqueo */}
            {item.estado_facturable === 'BLOQUEADO' && item.motivo_bloqueo && (
              <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/20">
                <p className="text-[12px] font-semibold text-red-700 dark:text-red-400">
                  {item.motivo_bloqueo.replace(/_/g, ' ')}
                </p>
                {item.detalle_bloqueo && (
                  <p className="mt-1 text-[12px] text-red-600 dark:text-red-300/70">
                    {item.detalle_bloqueo}
                  </p>
                )}
                <p className="mt-2 text-[12px] font-medium text-red-700 dark:text-red-400">
                  → {MOTIVO_ACCION[item.motivo_bloqueo as MotivoBloqueo] ?? 'Revisar con finanzas'}
                </p>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12px] text-brand-blue-gray dark:text-white/40">{label}</span>
      <span className="text-right text-[13px] font-medium text-brand-black dark:text-white">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 1 — Pipeline
// ---------------------------------------------------------------------------

function TabPipeline({
  resumen,
  filtroMotivoExterno,
  onLimpiarMotivoExterno,
}: {
  resumen: ResumenFacturacion | undefined
  filtroMotivoExterno: string | null
  onLimpiarMotivoExterno: () => void
}) {
  const [pagina,      setPagina]      = useState(1)
  const [search,      setSearch]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [tipoOV,      setTipoOV]      = useState('')
  const [fechaHasta,  setFechaHasta]  = useState('')
  const [panelItem,   setPanelItem]   = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline', pagina, search, estado, tipoOV, fechaHasta, filtroMotivoExterno],
    queryFn: () => getPipeline({
      page:              pagina,
      search:            search || undefined,
      estado_facturable: filtroMotivoExterno ? 'BLOQUEADO' : estado || undefined,
      tipo_ov:           tipoOV || undefined,
      fecha_hasta:       fechaHasta || undefined,
    }),
    staleTime: QUERY_STALE_TIME,
  })

  const totalPaginas = data ? Math.ceil(data.count / 50) : 1

  function limpiarFiltros() {
    setPagina(1)
    setSearch('')
    setEstado('')
    setTipoOV('')
    setFechaHasta('')
    onLimpiarMotivoExterno()
  }

  // 4 métricas
  const metricas = [
    {
      label: 'Facturable hoy',
      monto: resumen?.facturable_hoy.monto ?? 0,
      count: resumen?.facturable_hoy.count ?? 0,
      color: 'border-green-200 dark:border-green-900/40',
      icon:  <DollarSign size={20} className="text-green-600 dark:text-green-400" />,
      bg:    'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Próximos 30 días',
      monto: resumen?.facturable_30_dias.monto ?? 0,
      count: resumen?.facturable_30_dias.count ?? 0,
      color: 'border-blue-200 dark:border-blue-900/40',
      icon:  <Calendar size={20} className="text-brand-blue dark:text-blue-400" />,
      bg:    'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Próximos 90 días',
      monto: resumen?.facturable_90_dias.monto ?? 0,
      count: resumen?.facturable_90_dias.count ?? 0,
      color: 'border-brand-alice-blue dark:border-white/10',
      icon:  <TrendingUp size={20} className="text-brand-steel-blue dark:text-white/50" />,
      bg:    'bg-brand-alice-blue dark:bg-white/5',
    },
    {
      label: 'Bloqueado',
      monto: resumen?.bloqueado.monto ?? 0,
      count: resumen?.bloqueado.count ?? 0,
      color: 'border-red-200 dark:border-red-900/40',
      icon:  <Lock size={20} className="text-red-600 dark:text-red-400" />,
      bg:    'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <>
      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricas.map((m) => (
          <div
            key={m.label}
            className={cn(
              'rounded-[16px] border bg-white p-5 shadow-sm dark:bg-brand-dark-blue',
              m.color
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
                {m.label}
              </p>
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-[10px]', m.bg)}>
                {m.icon}
              </div>
            </div>
            <p className="mt-3 text-[26px] font-semibold leading-none text-brand-black dark:text-white">
              {resumen ? formatCLP(m.monto) : '—'}
            </p>
            <p className="mt-1 text-[12px] text-brand-blue-gray dark:text-white/40">
              {m.count} ítems
            </p>
          </div>
        ))}
      </div>

      {/* Filtros externos (desde tab Bloqueos) */}
      {filtroMotivoExterno && (
        <div className="flex items-center gap-3 rounded-[10px] border border-orange-200 bg-orange-50 px-4 py-2.5 dark:border-orange-900/40 dark:bg-orange-900/20">
          <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400" />
          <p className="flex-1 text-[13px] text-orange-700 dark:text-orange-300">
            Filtrando por bloqueo: <strong>{filtroMotivoExterno.replace(/_/g, ' ')}</strong>
          </p>
          <button
            onClick={onLimpiarMotivoExterno}
            className="text-[12px] text-orange-600 underline dark:text-orange-400"
          >
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue-gray dark:text-white/40" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagina(1) }}
            placeholder="Buscar cliente o N° OV…"
            className={cn(
              'w-full rounded-[10px] border border-brand-alice-blue py-2 pl-9 pr-3',
              'text-[13px] text-brand-black placeholder:text-brand-blue-gray/60',
              'focus:border-brand-blue focus:outline-none dark:border-white/10',
              'bg-white dark:bg-brand-dark-blue dark:text-white'
            )}
          />
        </div>
        <select
          value={filtroMotivoExterno ? 'BLOQUEADO' : estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1) }}
          disabled={!!filtroMotivoExterno}
          className="rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] text-brand-black focus:outline-none dark:border-white/10 dark:bg-brand-dark-blue dark:text-white"
        >
          <option value="">Todos los estados</option>
          <option value="FACTURABLE_HOY">Facturable hoy</option>
          <option value="FACTURABLE_FUTURO">Facturable futuro</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="FACTURADO">Facturado</option>
        </select>
        <select
          value={tipoOV}
          onChange={(e) => { setTipoOV(e.target.value); setPagina(1) }}
          className="rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] text-brand-black focus:outline-none dark:border-white/10 dark:bg-brand-dark-blue dark:text-white"
        >
          <option value="">Todos los tipos</option>
          <option value="ESTANDAR">Estándar</option>
          <option value="HITO">Hito</option>
          <option value="ANTICIPO">Anticipo</option>
        </select>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => { setFechaHasta(e.target.value); setPagina(1) }}
          className="rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] text-brand-black focus:outline-none dark:border-white/10 dark:bg-brand-dark-blue dark:text-white"
        />
        <button
          onClick={limpiarFiltros}
          className="flex items-center gap-1.5 rounded-[10px] border border-brand-alice-blue px-3 py-2 text-[13px] text-brand-blue-gray hover:border-brand-black dark:border-white/10 dark:text-white/40 dark:hover:border-white/30"
        >
          <X size={13} /> Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['Tipo OV', 'N° OV', 'Cliente', 'Tipo Doc', 'SKU / Hito', 'Monto', 'F. Facturable', 'Estado', 'Motivo Bloqueo'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-blue-gray dark:text-white/40">
                    <RotateCcw size={20} className="mx-auto mb-2 animate-spin" />
                    Cargando pipeline…
                  </td>
                </tr>
              )}
              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-blue-gray dark:text-white/40">
                    Sin ítems para los filtros seleccionados.
                  </td>
                </tr>
              )}
              {!isLoading && data?.results.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setPanelItem(item.id)}
                  className="cursor-pointer border-b border-brand-alice-blue/60 transition-colors hover:bg-brand-alice-blue/50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <BadgeTipoOV tipo={item.tipo_ov} />
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-black dark:text-white">
                    {item.numero_ov ?? '—'}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-brand-blue-gray dark:text-white/70">
                    {item.cliente_nombre}
                  </td>
                  <td className="px-4 py-3 text-brand-blue-gray dark:text-white/50">
                    {item.tipo_documento.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-brand-blue-gray dark:text-white/50">
                    {item.sku || item.borrador_fecha
                      ? item.sku || `Hito ${formatFecha(item.borrador_fecha)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-black dark:text-white">
                    {formatCLP(item.monto_facturable)}
                  </td>
                  <td className="px-4 py-3 text-brand-blue-gray dark:text-white/50">
                    {formatFecha(item.fecha_facturable)}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeEstado estado={item.estado_facturable} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-brand-blue-gray dark:text-white/40">
                    {item.motivo_bloqueo
                      ? item.motivo_bloqueo.replace(/_/g, ' ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
      </div>

      {/* Panel lateral */}
      <PanelLateral itemId={panelItem} onClose={() => setPanelItem(null)} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Tab 2 — Proyección
// ---------------------------------------------------------------------------

const COLORES_PROYECCION = ['#16a34a', '#2563eb', '#dc2626']

function TabProyeccion() {
  const { data: proyeccion, isLoading } = useQuery({
    queryKey: ['proyeccion-facturacion'],
    queryFn: () => getProyeccionFacturacion(6),
    staleTime: QUERY_STALE_TIME,
  })

  const datos = (proyeccion ?? []).map((p) => ({
    mes:             nombreMes(p.mes),
    'Facturable hoy':  p.facturable_hoy,
    'Futuro':          p.facturable_futuro,
    'Bloqueado':       p.bloqueado,
    _raw:            p,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-brand-alice-blue bg-white p-6 shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
        <p className="mb-4 text-[15px] font-semibold text-brand-black dark:text-white">
          Proyección de facturación — próximos 6 meses
        </p>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <RotateCcw size={20} className="animate-spin text-brand-blue-gray" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={datos} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: 'currentColor' }}
                className="text-brand-blue-gray dark:text-white/50"
              />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
                }
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-brand-blue-gray dark:text-white/50"
              />
              <Tooltip
                formatter={(value) => formatCLP(Number(value))}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Facturable hoy" stackId="a" fill={COLORES_PROYECCION[0]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Futuro"         stackId="a" fill={COLORES_PROYECCION[1]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Bloqueado"      stackId="a" fill={COLORES_PROYECCION[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabla resumen */}
      {proyeccion && proyeccion.length > 0 && (
        <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['Mes', 'Total', 'Facturable hoy', 'Facturable futuro', 'Bloqueado'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proyeccion.map((p) => (
                <tr
                  key={p.mes}
                  className="border-b border-brand-alice-blue/60 dark:border-white/5"
                >
                  <td className="px-4 py-3 font-medium text-brand-black dark:text-white">
                    {nombreMes(p.mes)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-brand-black dark:text-white">
                    {formatCLP(p.monto)}
                  </td>
                  <td className="px-4 py-3 text-green-600 dark:text-green-400">
                    {formatCLP(p.facturable_hoy)}
                  </td>
                  <td className="px-4 py-3 text-brand-blue dark:text-blue-400">
                    {formatCLP(p.facturable_futuro)}
                  </td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400">
                    {formatCLP(p.bloqueado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab 3 — Bloqueos
// ---------------------------------------------------------------------------

const COLORES_DONUT = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#06b6d4', '#10b981', '#6b7280']

function TabBloqueos({
  resumen,
  onFiltrarMotivo,
}: {
  resumen: ResumenFacturacion | undefined
  onFiltrarMotivo: (motivo: string) => void
}) {
  const bloqueos = resumen?.bloqueos_por_motivo ?? {}
  const total    = Object.values(bloqueos).reduce((acc, b) => acc + b.count, 0)

  const datos = Object.entries(bloqueos)
    .sort((a, b) => b[1].monto - a[1].monto)
    .map(([motivo, data], i) => ({
      motivo,
      count: data.count,
      monto: data.monto,
      color: COLORES_DONUT[i % COLORES_DONUT.length],
      pct:   total > 0 ? Math.round((data.count / total) * 100) : 0,
    }))

  return (
    <div className="flex flex-col gap-6">
      {datos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-green-200 bg-green-50 p-12 dark:border-green-900/40 dark:bg-green-900/20">
          <CheckCircle2 size={40} className="text-green-500" />
          <p className="text-[15px] font-medium text-green-700 dark:text-green-400">
            Sin bloqueos en el pipeline actual
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Donut */}
          <div className="rounded-[16px] border border-brand-alice-blue bg-white p-6 shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
            <p className="mb-2 text-[15px] font-semibold text-brand-black dark:text-white">
              Bloqueos por motivo
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={datos}
                  dataKey="count"
                  nameKey="motivo"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                >
                  {datos.map((d) => (
                    <Cell key={d.motivo} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [String(value) + ' ítems', String(name).replace(/_/g, ' ')]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Info card */}
          <div className="rounded-[16px] border border-brand-alice-blue bg-white p-6 shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
            <p className="mb-2 text-[15px] font-semibold text-brand-black dark:text-white">
              Resumen
            </p>
            <p className="text-[13px] text-brand-blue-gray dark:text-white/50">
              {total} ítems bloqueados · {formatCLP(resumen?.bloqueado.monto ?? 0)} en riesgo
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {datos.slice(0, 4).map((d) => (
                <div key={d.motivo} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="flex-1 text-[12px] text-brand-blue-gray dark:text-white/50">
                    {d.motivo.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[12px] font-medium text-brand-black dark:text-white">
                    {d.count} ({d.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de bloqueos */}
      {datos.length > 0 && (
        <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white shadow-sm dark:border-white/10 dark:bg-brand-dark-blue">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['Motivo', 'Cantidad', 'Monto Bloqueado', '% del Total', 'Acción Sugerida'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr
                  key={d.motivo}
                  onClick={() => onFiltrarMotivo(d.motivo)}
                  className="cursor-pointer border-b border-brand-alice-blue/60 transition-colors hover:bg-brand-alice-blue/50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
                      <span className="font-medium text-brand-black dark:text-white">
                        {d.motivo.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-black dark:text-white">{d.count}</td>
                  <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">
                    {formatCLP(d.monto)}
                  </td>
                  <td className="px-4 py-3 text-brand-blue-gray dark:text-white/50">{d.pct}%</td>
                  <td className="px-4 py-3 text-[12px] text-brand-blue dark:text-blue-400">
                    {MOTIVO_ACCION[d.motivo as MotivoBloqueo] ?? 'Revisar con finanzas'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos.length > 0 && (
        <div className="flex items-center gap-2 rounded-[10px] border border-brand-alice-blue bg-brand-alice-blue/50 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
          <Info size={13} className="shrink-0 text-brand-blue-gray dark:text-white/40" />
          <p className="text-[12px] text-brand-blue-gray dark:text-white/40">
            Haz click en una fila para ver los ítems bloqueados por ese motivo en el tab Pipeline.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

type TabId = 'pipeline' | 'proyeccion' | 'bloqueos'

const TABS: { id: TabId; label: string }[] = [
  { id: 'pipeline',   label: 'Pipeline' },
  { id: 'proyeccion', label: 'Proyección' },
  { id: 'bloqueos',   label: 'Bloqueos' },
]

export default function Facturacion() {
  const qc = useQueryClient()
  const [tab,              setTab]              = useState<TabId>('pipeline')
  const [filtroMotivo,     setFiltroMotivo]     = useState<string | null>(null)
  const [calculando,       setCalculando]       = useState(false)

  const { data: resumen } = useQuery({
    queryKey: ['resumen-facturacion'],
    queryFn:  getResumenFacturacion,
    staleTime: QUERY_STALE_TIME,
  })

  const mutCalcualar = useMutation({
    mutationFn: () => calcularPipeline(),
    onMutate:   () => setCalculando(true),
    onSettled:  () => {
      setCalculando(false)
      qc.invalidateQueries({ queryKey: ['resumen-facturacion'] })
      qc.invalidateQueries({ queryKey: ['pipeline'] })
      qc.invalidateQueries({ queryKey: ['proyeccion-facturacion'] })
    },
  })

  function irABloqueo(motivo: string) {
    setFiltroMotivo(motivo)
    setTab('pipeline')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
            Pipeline de Facturación
          </h2>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            {resumen?.ultimo_calculo
              ? `Último cálculo: ${new Date(resumen.ultimo_calculo).toLocaleString('es-CL')}`
              : 'Sin cálculo reciente — ejecuta el pipeline para ver datos.'}
          </p>
        </div>
        <button
          onClick={() => mutCalcualar.mutate()}
          disabled={calculando}
          className={cn(
            'flex items-center gap-2 rounded-pill px-5 py-2.5 text-[13px] font-medium transition-all',
            'bg-brand-blue text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {calculando ? (
            <>
              <RotateCcw size={14} className="animate-spin" />
              Calculando…
            </>
          ) : (
            <>
              <Play size={14} />
              Calcular Pipeline
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[12px] border border-brand-alice-blue bg-brand-alice-blue/50 p-1 dark:border-white/10 dark:bg-white/5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-all duration-300',
              tab === t.id
                ? 'bg-white text-brand-black shadow-sm dark:bg-brand-dark-blue dark:text-white'
                : 'text-brand-blue-gray hover:text-brand-black dark:text-white/40 dark:hover:text-white'
            )}
          >
            {t.label}
            {t.id === 'bloqueos' && resumen && resumen.bloqueado.count > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {resumen.bloqueado.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'pipeline' && (
        <TabPipeline
          resumen={resumen}
          filtroMotivoExterno={filtroMotivo}
          onLimpiarMotivoExterno={() => setFiltroMotivo(null)}
        />
      )}
      {tab === 'proyeccion' && <TabProyeccion />}
      {tab === 'bloqueos' && (
        <TabBloqueos
          resumen={resumen}
          onFiltrarMotivo={irABloqueo}
        />
      )}
    </div>
  )
}
