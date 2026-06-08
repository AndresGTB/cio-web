import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Package,
  X,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  TrendingDown,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { formatFecha } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import {
  getSugerencias,
  getResumenCompras,
  gestionarSugerencia,
  getAnalisisDMI,
  getResumenDMI,
  analizarDMI,
} from '@/api/compras'
import { QUERY_STALE_TIME } from '@/lib/constants'
import type {
  SugerenciaCompra,
  UrgenciaCompra,
  EstadoSugerencia,
  MotivoExcepcion,
  AnalisisDMI,
  ClasificacionDMI,
} from '@/types'

function formatCLP(v: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v)
}

function diasHasta(fechaISO: string): number {
  return Math.ceil((new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ------------------------------------------------------------------ //
// Paginación compartida
// ------------------------------------------------------------------ //

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
  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - ventana + 1))
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

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ //
// MetricaCard
// ------------------------------------------------------------------ //

function MetricaCard({
  label,
  valor,
  sub,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  valor: number | string
  sub?: string
  icon: React.ElementType
  color: string
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-4 rounded-[16px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]', color)}>
        <Icon size={20} strokeWidth={1} />
      </div>
      <div className="min-w-0">
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
        {sub && !loading && (
          <p className="text-[11px] text-brand-blue-gray dark:text-white/40 truncate">{sub}</p>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Badge Urgencia
// ------------------------------------------------------------------ //

const URGENCIA_CONFIG: Record<UrgenciaCompra, { label: string; className: string; dot?: boolean }> = {
  URGENTE: {
    label: 'Urgente',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dot: true,
  },
  PROGRAMADA: {
    label: 'Programada',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  RIESGO_ETA: {
    label: 'Riesgo ETA',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  MONITOREO: {
    label: 'Monitoreo',
    className: 'bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50',
  },
}

function BadgeUrgencia({ urgencia }: { urgencia: UrgenciaCompra }) {
  const cfg = URGENCIA_CONFIG[urgencia]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[12px] font-medium',
        cfg.className
      )}
    >
      {cfg.dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      )}
      {cfg.label}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Badge Estado Sugerencia
// ------------------------------------------------------------------ //

const ESTADO_SUG_CONFIG: Record<EstadoSugerencia, { label: string; className: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  ACEPTADA: {
    label: 'Aceptada',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  IGNORADA: {
    label: 'Ignorada',
    className: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/30',
  },
  VENCIDA: {
    label: 'Vencida',
    className: 'bg-red-50 text-red-400 dark:bg-red-900/20 dark:text-red-400',
  },
  RESUELTA: {
    label: 'Resuelta',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
}

function BadgeEstadoSug({ estado }: { estado: EstadoSugerencia }) {
  const cfg = ESTADO_SUG_CONFIG[estado]
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium', cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Modal Ignorar
// ------------------------------------------------------------------ //

const MOTIVOS: { value: MotivoExcepcion; label: string }[] = [
  { value: 'CLIENTE_CRITICO', label: 'Cliente crítico' },
  { value: 'DESCUENTO_PROVEEDOR', label: 'Descuento proveedor' },
  { value: 'COMPRA_MINIMA', label: 'Compra mínima' },
  { value: 'CONSOLIDACION_IMPORTACION', label: 'Consolidación importación' },
  { value: 'DECISION_GERENCIAL', label: 'Decisión gerencial' },
  { value: 'OTRO', label: 'Otro' },
]

interface ModalIgnorarProps {
  sugerencia: SugerenciaCompra
  onConfirm: (motivo_excepcion: MotivoExcepcion, motivo_texto: string) => void
  onCancel: () => void
  loading: boolean
}

function ModalIgnorar({ sugerencia, onConfirm, onCancel, loading }: ModalIgnorarProps) {
  const [motivo, setMotivo] = useState<MotivoExcepcion | ''>('')
  const [texto, setTexto] = useState('')

  const requiereMotivo = sugerencia.urgencia === 'URGENTE'
  const requiereTexto = motivo === 'OTRO'
  const textoValido = !requiereTexto || texto.trim().length >= 20
  const motivoValido = !requiereMotivo || motivo !== ''
  const puedeConfirmar = motivoValido && textoValido && !loading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[16px] border border-brand-alice-blue bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-brand-black dark:text-white">
            Ignorar sugerencia
          </h3>
          <button
            onClick={onCancel}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-brand-blue-gray hover:bg-brand-alice-blue dark:hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-[13px] text-brand-blue-gray dark:text-white/50">
          <span className="font-medium text-brand-black dark:text-white">{sugerencia.sku}</span>
          {' '}· OV {sugerencia.numero_ov} · {sugerencia.cliente_nombre}
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-brand-blue-gray dark:text-white/60">
              Motivo de excepción{requiereMotivo && <span className="ml-1 text-semantic-error">*</span>}
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as MotivoExcepcion | '')}
              className={cn(
                'h-10 w-full rounded-[10px] border border-brand-alice-blue px-3',
                'text-[13px] text-brand-black outline-none',
                'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
                'focus:border-brand-blue dark:focus:border-blue-400'
              )}
            >
              <option value="">— Seleccionar —</option>
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-brand-blue-gray dark:text-white/60">
              Observación{requiereTexto && <span className="ml-1 text-semantic-error">* (mín. 20 caracteres)</span>}
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              placeholder="Descripción adicional..."
              className={cn(
                'w-full rounded-[10px] border border-brand-alice-blue p-3',
                'text-[13px] text-brand-black outline-none resize-none',
                'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
                'focus:border-brand-blue dark:focus:border-blue-400',
                'placeholder:text-brand-steel-blue/60'
              )}
            />
            {requiereTexto && texto.trim().length > 0 && texto.trim().length < 20 && (
              <p className="mt-1 text-[11px] text-semantic-error">
                Faltan {20 - texto.trim().length} caracteres
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className={cn(
              'h-9 rounded-[10px] border border-brand-alice-blue px-4',
              'text-[13px] font-medium text-brand-blue-gray',
              'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white/60',
              'hover:border-brand-black hover:text-brand-black dark:hover:border-white/30 dark:hover:text-white'
            )}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (puedeConfirmar) onConfirm(motivo as MotivoExcepcion, texto)
            }}
            disabled={!puedeConfirmar}
            className={cn(
              'h-9 rounded-[10px] px-4 text-[13px] font-medium',
              'bg-semantic-error text-white transition-opacity',
              'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            {loading ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Fila de sugerencia
// ------------------------------------------------------------------ //

function FilaSugerencia({
  sugerencia,
  onGestionar,
}: {
  sugerencia: SugerenciaCompra
  onGestionar: (id: number, accion: 'ACEPTAR' | 'IGNORAR') => void
}) {
  const diasComprar = diasHasta(sugerencia.fecha_sugerida_compra)
  const diasColor =
    diasComprar <= 0
      ? 'text-semantic-error font-semibold'
      : diasComprar <= 7
      ? 'text-[#F1A828] font-semibold'
      : 'text-brand-black dark:text-white'

  return (
    <tr className="border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <BadgeUrgencia urgencia={sugerencia.urgencia} />
      </td>
      <td className="px-4 py-3 max-w-[160px]">
        <span className="font-medium text-brand-black dark:text-white">{sugerencia.sku}</span>
        <br />
        <span
          className="block truncate text-[11px] text-brand-blue-gray dark:text-white/40"
          title={sugerencia.descripcion}
        >
          {sugerencia.descripcion}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-brand-black dark:text-white">{sugerencia.numero_ov}</span>
        <br />
        <span className="text-[11px] text-brand-blue-gray dark:text-white/40">{sugerencia.cliente_nombre}</span>
      </td>
      <td className="px-4 py-3 tabular-nums text-right text-brand-black dark:text-white">
        {Number(sugerencia.cantidad_sugerida).toLocaleString('es-CL')}
      </td>
      <td className="px-4 py-3 tabular-nums text-right">
        {sugerencia.valor_estimado ? (
          <span className="text-brand-black dark:text-white">
            {formatCLP(Number(sugerencia.valor_estimado))}
          </span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[13px]">
        {sugerencia.fecha_compromiso ? (
          <span className="text-brand-black dark:text-white">
            {formatFecha(sugerencia.fecha_compromiso)}
          </span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[13px] text-brand-black dark:text-white">
        {formatFecha(sugerencia.fecha_sugerida_compra)}
      </td>
      <td className={cn('px-4 py-3 text-[13px] tabular-nums', diasColor)}>
        {diasComprar > 0 ? `+${diasComprar}d` : `${diasComprar}d`}
      </td>
      <td className="px-4 py-3">
        <BadgeEstadoSug estado={sugerencia.estado} />
      </td>
      <td className="px-4 py-3">
        {sugerencia.estado === 'PENDIENTE' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onGestionar(sugerencia.id, 'ACEPTAR')}
              className={cn(
                'rounded-[8px] px-2.5 py-1 text-[12px] font-medium',
                'bg-semantic-success/10 text-semantic-success',
                'hover:bg-semantic-success/20 transition-colors'
              )}
            >
              Aceptar
            </button>
            <button
              onClick={() => onGestionar(sugerencia.id, 'IGNORAR')}
              className={cn(
                'rounded-[8px] border border-semantic-error/40 px-2.5 py-1 text-[12px] font-medium',
                'text-semantic-error',
                'hover:bg-semantic-error/10 transition-colors'
              )}
            >
              Ignorar
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Tab Sugerencias
// ------------------------------------------------------------------ //

function TabSugerencias() {
  const [urgencia, setUrgencia] = useState('')
  const [estado, setEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalIgnorar, setModalIgnorar] = useState<SugerenciaCompra | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)
  const qc = useQueryClient()

  const filtros = {
    ...(urgencia && { urgencia }),
    ...(estado && { estado }),
    ...(busquedaDebounced && { search: busquedaDebounced }),
    page: pagina,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['sugerencias', filtros],
    queryFn: () => getSugerencias(filtros),
    staleTime: QUERY_STALE_TIME,
  })

  const { data: resumen, isLoading: cargandoResumen } = useQuery({
    queryKey: ['resumen-compras'],
    queryFn: getResumenCompras,
    staleTime: QUERY_STALE_TIME,
  })

  const gestionar = useMutation({
    mutationFn: ({
      id,
      accion,
      motivo_excepcion,
      motivo_texto,
    }: {
      id: number
      accion: 'ACEPTAR' | 'IGNORAR'
      motivo_excepcion?: string
      motivo_texto?: string
    }) => gestionarSugerencia(id, { accion, motivo_excepcion, motivo_texto }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sugerencias'] })
      qc.invalidateQueries({ queryKey: ['resumen-compras'] })
      setModalIgnorar(null)
    },
  })

  function handleGestionar(id: number, accion: 'ACEPTAR' | 'IGNORAR') {
    if (accion === 'ACEPTAR') {
      gestionar.mutate({ id, accion })
    } else {
      const sug = data?.results.find((s) => s.id === id)
      if (sug) setModalIgnorar(sug)
    }
  }

  const totalPaginas = data ? Math.ceil(data.count / 50) : 0

  return (
    <div className="flex flex-col gap-6">
      {modalIgnorar && (
        <ModalIgnorar
          sugerencia={modalIgnorar}
          loading={gestionar.isPending}
          onCancel={() => setModalIgnorar(null)}
          onConfirm={(motivo_excepcion, motivo_texto) =>
            gestionar.mutate({
              id: modalIgnorar.id,
              accion: 'IGNORAR',
              motivo_excepcion,
              motivo_texto,
            })
          }
        />
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricaCard
          label="Urgentes"
          valor={resumen?.urgentes_pendientes ?? 0}
          sub={resumen ? formatCLP(resumen.valor_urgente) : undefined}
          icon={AlertTriangle}
          color="bg-semantic-error/10 text-semantic-error"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="Programadas"
          valor={resumen?.programadas_pendientes ?? 0}
          sub={resumen ? formatCLP(resumen.valor_programado) : undefined}
          icon={Clock}
          color="bg-semantic-warning/10 text-semantic-warning"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="Riesgo ETA"
          valor={resumen?.riesgo_eta_pendientes ?? 0}
          icon={Package}
          color="bg-[#F1A828]/10 text-[#F1A828]"
          loading={cargandoResumen}
        />
        <MetricaCard
          label="Vencidas"
          valor={resumen?.sugerencias_vencidas ?? 0}
          icon={X}
          color="bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50"
          loading={cargandoResumen}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Buscar SKU, OV, cliente..."
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

        <select
          value={urgencia}
          onChange={(e) => { setUrgencia(e.target.value); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3',
            'text-[13px] font-medium text-brand-black outline-none',
            'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'focus:border-[#73B8EF]'
          )}
        >
          <option value="">Todas las urgencias</option>
          <option value="URGENTE">Urgente</option>
          <option value="PROGRAMADA">Programada</option>
          <option value="RIESGO_ETA">Riesgo ETA</option>
          <option value="MONITOREO">Monitoreo</option>
        </select>

        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3',
            'text-[13px] font-medium text-brand-black outline-none',
            'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'focus:border-[#73B8EF]'
          )}
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="ACEPTADA">Aceptada</option>
          <option value="IGNORADA">Ignorada</option>
          <option value="VENCIDA">Vencida</option>
          <option value="RESUELTA">Resuelta</option>
        </select>

        {!isLoading && data && (
          <span className="ml-auto text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {data.count.toLocaleString('es-CL')} sugerencias
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {[
                  'Urgencia', 'SKU', 'OV / Cliente', 'Qty', 'Valor Est.',
                  'F. Compromiso', 'F. Sug. Compra', 'Días', 'Estado', 'Acciones',
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
              {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}

              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Package size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin sugerencias</p>
                    <p className="mt-1 text-[13px] font-light">
                      Genera sugerencias desde el Motor ATP o ajusta los filtros
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                data?.results.map((s) => (
                  <FilaSugerencia key={s.id} sugerencia={s} onGestionar={handleGestionar} />
                ))}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Badge Clasificación DMI
// ------------------------------------------------------------------ //

const CLASIF_CONFIG: Record<ClasificacionDMI, { label: string; className: string; color: string }> = {
  NECESARIA: {
    label: 'Necesaria',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    color: '#22c55e',
  },
  PROXIMA: {
    label: 'Próxima',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    color: '#3b82f6',
  },
  ANTICIPADA: {
    label: 'Anticipada',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    color: '#F1A828',
  },
  STOCK: {
    label: 'Stock',
    className: 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/30',
    color: '#94a3b8',
  },
  NO_ALINEADA: {
    label: 'No alineada',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    color: '#E5031F',
  },
}

function BadgeClasificacion({ clasificacion }: { clasificacion: ClasificacionDMI }) {
  const cfg = CLASIF_CONFIG[clasificacion]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Fila DMI
// ------------------------------------------------------------------ //

function FilaDMI({ item }: { item: AnalisisDMI }) {
  const diasAdelantado =
    item.fecha_oc && item.fecha_entrega_oc
      ? Math.ceil(
          (new Date(item.fecha_entrega_oc).getTime() - new Date(item.fecha_oc).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

  return (
    <tr className="border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5">
      <td className="px-4 py-3">
        <BadgeClasificacion clasificacion={item.clasificacion} />
      </td>
      <td className="px-4 py-3 font-medium text-brand-black dark:text-white">
        {item.numero_oc}
      </td>
      <td className="px-4 py-3">
        <span className="text-brand-black dark:text-white">{item.proveedor_nombre}</span>
        <br />
        <span className="text-[11px] text-brand-blue-gray dark:text-white/40">{item.proveedor_codigo}</span>
      </td>
      <td className="px-4 py-3 max-w-[160px]">
        <span className="font-medium text-brand-black dark:text-white">{item.sku}</span>
        <br />
        <span
          className="block truncate text-[11px] text-brand-blue-gray dark:text-white/40"
          title={item.descripcion}
        >
          {item.descripcion}
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-right text-brand-black dark:text-white">
        {Number(item.cantidad_pendiente).toLocaleString('es-CL')}
      </td>
      <td className="px-4 py-3 tabular-nums text-right">
        {item.valor_compra ? (
          <span className="text-brand-black dark:text-white">{formatCLP(Number(item.valor_compra))}</span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-[13px] text-brand-black dark:text-white">
        {item.fecha_entrega_oc ? formatFecha(item.fecha_entrega_oc) : '—'}
      </td>
      <td className="px-4 py-3 tabular-nums text-right text-[13px]">
        {diasAdelantado !== null ? (
          <span
            className={cn(
              diasAdelantado > 30
                ? 'text-[#F1A828] font-semibold'
                : 'text-brand-black dark:text-white'
            )}
          >
            {diasAdelantado}d
          </span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-right">
        {item.valor_inmovilizado_estimado ? (
          <span className="text-semantic-error">{formatCLP(Number(item.valor_inmovilizado_estimado))}</span>
        ) : (
          <span className="text-brand-blue-gray">—</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-center text-brand-black dark:text-white">
        {item.lineas_ov_asociadas.length}
      </td>
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Donut DMI
// ------------------------------------------------------------------ //

function DonutDMI({
  porClasificacion,
  valorTotalAnticipado,
}: {
  porClasificacion: Record<string, { count: number; valor: number }>
  valorTotalAnticipado: number
}) {
  const ORDEN: ClasificacionDMI[] = ['NECESARIA', 'PROXIMA', 'ANTICIPADA', 'STOCK', 'NO_ALINEADA']
  const chartData = ORDEN
    .filter((k) => (porClasificacion[k]?.count ?? 0) > 0)
    .map((k) => ({
      name: CLASIF_CONFIG[k].label,
      value: porClasificacion[k].count,
      color: CLASIF_CONFIG[k].color,
    }))

  if (chartData.length === 0) return null

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [value, 'OC']}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #E5EBF3',
              fontSize: '12px',
            }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/40">
            Anticipado
          </p>
          <p className="text-[14px] font-semibold text-brand-black dark:text-white">
            {formatCLP(valorTotalAnticipado)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Tab DMI
// ------------------------------------------------------------------ //

function TabDMI() {
  const [clasificacion, setClasificacion] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [proveedorExpanded, setProveedorExpanded] = useState(false)

  const [elapsed, setElapsed] = useState(0)
  const [descartado, setDescartado] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)
  const qc = useQueryClient()

  const filtros = {
    ...(clasificacion && { clasificacion }),
    ...(busquedaDebounced && { sku: busquedaDebounced }),
    page: pagina,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['analisis-dmi', filtros],
    queryFn: () => getAnalisisDMI(filtros),
    staleTime: QUERY_STALE_TIME,
  })

  const { data: resumen, isLoading: cargandoResumen } = useQuery({
    queryKey: ['resumen-dmi'],
    queryFn: getResumenDMI,
    staleTime: QUERY_STALE_TIME,
  })

  const analizarMutation = useMutation({
    mutationFn: () => analizarDMI(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analisis-dmi'] })
      qc.invalidateQueries({ queryKey: ['resumen-dmi'] })
    },
  })

  useEffect(() => {
    if (analizarMutation.isPending && !descartado) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [analizarMutation.isPending, descartado])

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60)
    const ss = s % 60
    return m > 0 ? `${m}m ${ss}s` : `${ss}s`
  }

  const mostrarSpinner = analizarMutation.isPending && !descartado
  const totalPaginas = data ? Math.ceil(data.count / 50) : 0
  const ORDEN_CLASIF: ClasificacionDMI[] = ['NECESARIA', 'PROXIMA', 'ANTICIPADA', 'STOCK', 'NO_ALINEADA']

  return (
    <div className="flex flex-col gap-6">
      {/* Header con botón Analizar y tarjetas resumen */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {ORDEN_CLASIF.map((clas) => {
            const item = resumen?.por_clasificacion[clas]
            if (!item && !cargandoResumen) return null
            const cfg = CLASIF_CONFIG[clas]
            return (
              <div
                key={clas}
                className="flex items-center gap-2 rounded-[12px] border border-brand-alice-blue bg-white px-3 py-2 dark:border-white/10 dark:bg-brand-dark-blue"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.color }} />
                <span className="text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                  {cfg.label}
                </span>
                {cargandoResumen ? (
                  <div className="h-4 w-6 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
                ) : (
                  <span className="text-[13px] font-semibold text-brand-black dark:text-white">
                    {item?.count ?? 0}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => {
              setDescartado(false)
              analizarMutation.mutate()
            }}
            disabled={mostrarSpinner}
            className={cn(
              'flex items-center gap-2 rounded-pill px-4 py-2 text-[13px] font-medium transition-all',
              'bg-brand-blue text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            {mostrarSpinner ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                Analizando… {formatElapsed(elapsed)}
              </>
            ) : (
              <>
                <Play size={14} />
                Analizar ahora
              </>
            )}
          </button>
          {mostrarSpinner && elapsed >= 60 && (
            <button
              onClick={() => setDescartado(true)}
              className="flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] text-brand-blue-gray hover:text-brand-black dark:text-white/40 dark:hover:text-white"
            >
              <X size={10} />
              Descartar
            </button>
          )}
          {resumen?.ultimo_analisis && (
            <p className="text-[11px] text-brand-blue-gray dark:text-white/40">
              Último análisis: {formatFecha(resumen.ultimo_analisis)}
            </p>
          )}
        </div>
      </div>

      {/* Donut + métricas inmovilizado */}
      {resumen && (
        <div className="flex flex-wrap gap-4">
          {Object.values(resumen.por_clasificacion).some(v => v.count > 0) && (
            <div className="w-full lg:w-auto flex-shrink-0 rounded-[16px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue" style={{ minWidth: 240 }}>
              <DonutDMI
                porClasificacion={resumen.por_clasificacion}
                valorTotalAnticipado={resumen.valor_total_anticipado}
              />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <MetricaCard
              label="Valor anticipado total"
              valor={formatCLP(resumen.valor_total_anticipado ?? 0)}
              icon={TrendingDown}
              color="bg-[#F1A828]/10 text-[#F1A828]"
            />
            <MetricaCard
              label="Valor inmovilizado est."
              valor={formatCLP(resumen.valor_inmovilizado_estimado ?? 0)}
              icon={Package}
              color="bg-semantic-error/10 text-semantic-error"
            />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue"
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Buscar SKU..."
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

        <select
          value={clasificacion}
          onChange={(e) => { setClasificacion(e.target.value); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3',
            'text-[13px] font-medium text-brand-black outline-none',
            'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'focus:border-[#73B8EF]'
          )}
        >
          <option value="">Todas las clasificaciones</option>
          {ORDEN_CLASIF.map((c) => (
            <option key={c} value={c}>{CLASIF_CONFIG[c].label}</option>
          ))}
        </select>

        {!isLoading && data && (
          <span className="ml-auto text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {data.count.toLocaleString('es-CL')} registros
          </span>
        )}
      </div>

      {/* Tabla DMI */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {[
                  'Clasificación', 'N° OC', 'Proveedor', 'SKU',
                  'Qty OC', 'Valor', 'F. Entrega', 'Días Adel.', 'Valor Inmov.', 'Líneas OV',
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
              {isLoading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}

              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Package size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin análisis DMI</p>
                    <p className="mt-1 text-[13px] font-light">
                      Ejecuta el análisis para identificar compras anticipadas
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                data?.results.map((item) => <FilaDMI key={item.id} item={item} />)}
            </tbody>
          </table>
        </div>
        <Paginacion pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
      </div>

      {/* Resumen por proveedor */}
      {resumen && resumen.por_proveedor.length > 0 && (
        <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
          <button
            onClick={() => setProveedorExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <span className="text-[15px] font-semibold text-brand-black dark:text-white">
              Resumen por proveedor
            </span>
            {proveedorExpanded ? (
              <ChevronUp size={16} className="text-brand-blue-gray dark:text-white/40" />
            ) : (
              <ChevronDown size={16} className="text-brand-blue-gray dark:text-white/40" />
            )}
          </button>

          {proveedorExpanded && (
            <div className="overflow-x-auto border-t border-brand-alice-blue dark:border-white/10">
              <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                <thead>
                  <tr>
                    {[
                      'Proveedor', 'Total OC', 'Valor Necesario',
                      'Valor Anticipado', 'No Alineado', '% Anticipado',
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
                  {resumen.por_proveedor.map((p) => (
                    <tr
                      key={p.proveedor_codigo}
                      className="border-b border-brand-alice-blue/50 transition-colors hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-brand-black dark:text-white">
                          {p.proveedor_nombre}
                        </span>
                        <br />
                        <span className="text-[11px] text-brand-blue-gray dark:text-white/40">
                          {p.proveedor_codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-brand-black dark:text-white">
                        {p.total_oc}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-brand-black dark:text-white">
                        {formatCLP(p.valor_necesario)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-[#F1A828]">
                        {formatCLP(p.valor_anticipado)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-semantic-error">
                        {formatCLP(p.valor_no_alineado)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-brand-alice-blue dark:bg-white/10">
                            <div
                              className="h-1.5 rounded-full bg-[#F1A828]"
                              style={{ width: `${Math.min(100, p.porcentaje_anticipado)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-[12px] font-medium text-brand-black dark:text-white">
                            {p.porcentaje_anticipado.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Tab button
// ------------------------------------------------------------------ //

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-[10px] px-4 py-2 text-[13px] font-medium transition-all duration-400',
        active
          ? 'bg-white text-brand-black shadow-sm dark:bg-brand-dark-blue dark:text-white'
          : 'text-brand-blue-gray hover:text-brand-black dark:text-white/50 dark:hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------------ //
// Página principal
// ------------------------------------------------------------------ //

export default function Compras() {
  const [tab, setTab] = useState<'sugerencias' | 'dmi'>('sugerencias')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
          Compras Inteligentes
        </h2>
        <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
          Sugerencias basadas en Motor ATP · Análisis DMI
        </p>
      </div>

      <div className="flex gap-1 rounded-[12px] border border-brand-alice-blue bg-brand-alice-blue/30 p-1 dark:border-white/10 dark:bg-white/5 w-fit">
        <TabBtn active={tab === 'sugerencias'} onClick={() => setTab('sugerencias')}>
          Sugerencias de Compra
        </TabBtn>
        <TabBtn active={tab === 'dmi'} onClick={() => setTab('dmi')}>
          Análisis DMI
        </TabBtn>
      </div>

      {tab === 'sugerencias' ? <TabSugerencias /> : <TabDMI />}
    </div>
  )
}
