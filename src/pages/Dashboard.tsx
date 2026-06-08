import { ShoppingCart, Package, AlertTriangle, FileText, ArrowRight, RefreshCw, PackageCheck, Layers, Play, RotateCcw, X, Clock, TrendingDown, DollarSign, Lock, Calendar } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useResumenDashboard } from '@/hooks/useOrdenes'
import { getEstadoSAP } from '@/api/sap'
import { sincronizarCompleto, getSyncEstado } from '@/api/inventario'
import { getResumenCompras } from '@/api/compras'
import { getResumenFacturacion } from '@/api/facturacion'
import { QUERY_STALE_TIME } from '@/lib/constants'

interface MetricaCardProps {
  titulo: string
  valor: number | string
  descripcion: string
  icon: React.ElementType
  color: 'blue' | 'warning' | 'success' | 'neutral'
  cargando?: boolean
}

function MetricaCard({ titulo, valor, descripcion, icon: Icon, color, cargando }: MetricaCardProps) {
  const colores = {
    blue: {
      bg: 'bg-brand-blue/10 dark:bg-blue-400/10',
      icon: 'text-brand-blue dark:text-blue-400',
      border: 'border-brand-blue/20 dark:border-blue-400/20',
    },
    warning: {
      bg: 'bg-semantic-warning/10 dark:bg-semantic-warning/20',
      icon: 'text-semantic-warning',
      border: 'border-semantic-warning/20',
    },
    success: {
      bg: 'bg-semantic-success/10 dark:bg-semantic-success/20',
      icon: 'text-semantic-success',
      border: 'border-semantic-success/20',
    },
    neutral: {
      bg: 'bg-brand-alice-blue dark:bg-white/5',
      icon: 'text-brand-steel-blue dark:text-white/50',
      border: 'border-brand-alice-blue dark:border-white/10',
    },
  }

  const c = colores[color]

  return (
    <div
      className={cn(
        'rounded-[16px] border bg-white p-6 shadow-sm transition-all duration-400 ease-out',
        'dark:bg-brand-dark-blue dark:shadow-none',
        'hover:shadow-md dark:hover:bg-brand-dark-blue/80',
        c.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
            {titulo}
          </p>
          {cargando ? (
            <div className="mt-2 h-10 w-20 animate-pulse rounded-[8px] bg-brand-alice-blue dark:bg-white/10" />
          ) : (
            <p className="mt-2 text-[40px] font-semibold leading-none text-brand-black dark:text-white">
              {valor}
            </p>
          )}
          <p className="mt-2 text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {descripcion}
          </p>
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[16px]', c.bg)}>
          <Icon size={24} strokeWidth={1} className={c.icon} />
        </div>
      </div>
    </div>
  )
}

function formatUltimoSync(fecha: string | null): string {
  if (!fecha) return 'Sin sincronización'
  const d = new Date(fecha)
  return d.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


type SyncStep = { errores?: string[] }

function SyncResumenPanel({ data }: { data: Record<string, unknown> }) {
  const socios   = data.socios          as ({ socios_procesados?: number;  socios_creados?: number } & SyncStep) | undefined
  const ordenes  = data.ordenes         as ({ ordenes_procesadas?: number; lineas_creadas?: number; lineas_actualizadas?: number } & SyncStep) | undefined
  const stock    = data.stock           as ({ items_procesados?: number } & SyncStep) | undefined
  const oc       = data.ordenes_compra  as ({ ocs_procesadas?: number } & SyncStep) | undefined
  const fr       = data.facturas_reserva as ({ docs_procesados?: number } & SyncStep) | undefined
  const fifo     = data.fifo            as ({ skus_procesados?: number; lineas_cubiertas?: number } & SyncStep) | undefined
  const atp      = data.atp             as ({ lineas_procesadas?: number; lineas_en_riesgo?: number } & SyncStep) | undefined

  const todosLosErrores = [socios, ordenes, stock, oc, fr, fifo, atp]
    .flatMap((p) => p?.errores ?? [])

  const filas: [string, string][] = [
    ['Socios',      `${socios?.socios_procesados ?? 0} (${socios?.socios_creados ?? 0} nuevos)`],
    ['OV',          `${ordenes?.ordenes_procesadas ?? 0} (${(ordenes?.lineas_creadas ?? 0) + (ordenes?.lineas_actualizadas ?? 0)} líneas)`],
    ['Stock',       `${stock?.items_procesados ?? 0} ítems`],
    ['OC',          `${oc?.ocs_procesadas ?? 0}`],
    ['F. Reserva',  `${fr?.docs_procesados ?? 0}`],
    ['FIFO',        `${fifo?.skus_procesados ?? 0} SKUs · ${fifo?.lineas_cubiertas ?? 0} cubiertas`],
    ['ATP',         `${atp?.lineas_procesadas ?? 0} líneas · ${atp?.lineas_en_riesgo ?? 0} en riesgo`],
  ]

  return (
    <div className="mt-2">
      <p className="text-[12px] font-medium text-brand-aquamarine">Sincronización completada</p>
      <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
        {filas.map(([label, val]) => (
          <span key={label} className="text-white/40">
            {label}: <span className="text-white/70">{val}</span>
          </span>
        ))}
      </div>
      {todosLosErrores.length > 0 && (
        <p className="mt-1.5 text-[11px] text-yellow-400">
          {todosLosErrores.length} advertencia(s) — {todosLosErrores[0]}
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [forzarCompleto, setForzarCompleto] = useState(false)
  const [syncActivo, setSyncActivo] = useState(false)
  const [syncDescartado, setSyncDescartado] = useState(false)
  const [syncResultado, setSyncResultado] = useState<Record<string, unknown> | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qc = useQueryClient()

  const { data: resumen, isLoading: cargandoResumen } = useResumenDashboard()

  const { data: sapStatus } = useQuery({
    queryKey: ['sap-status'],
    queryFn: getEstadoSAP,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: QUERY_STALE_TIME,
    retry: false,
  })

  const { data: resumenCompras } = useQuery({
    queryKey: ['resumen-compras'],
    queryFn: getResumenCompras,
    staleTime: QUERY_STALE_TIME,
  })

  const { data: resumenFacturacion } = useQuery({
    queryKey: ['resumen-facturacion'],
    queryFn: getResumenFacturacion,
    staleTime: QUERY_STALE_TIME,
  })

  // Cronómetro
  useEffect(() => {
    if (syncActivo && !syncDescartado) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [syncActivo, syncDescartado])

  // Polling de estado — corre mientras syncActivo, independiente de syncDescartado
  useEffect(() => {
    if (!syncActivo) return
    const MAX_POLL_MS = 30 * 60 * 1000  // 30 minutos de seguridad
    const startedAt = Date.now()

    pollRef.current = setInterval(async () => {
      // Timeout de seguridad por si el hilo queda colgado
      if (Date.now() - startedAt > MAX_POLL_MS) {
        setSyncActivo(false)
        setSyncError('Tiempo máximo de espera alcanzado (30 min). Verifica el servidor.')
        return
      }
      try {
        const estado = await getSyncEstado()
        if (!estado.en_proceso) {
          setSyncActivo(false)
          setSyncDescartado(false)
          if (estado.error) {
            setSyncError(estado.error)
          } else {
            setSyncResultado(estado.resultado)
          }
          qc.invalidateQueries({ queryKey: ['resumen-dashboard'] })
          qc.invalidateQueries({ queryKey: ['lineas-pendientes'] })
          qc.invalidateQueries({ queryKey: ['resumen-atp'] })
          qc.invalidateQueries({ queryKey: ['resumen-compras'] })
        }
      } catch {
        // ignorar errores de polling transitorios
      }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [syncActivo, qc])

  const handleSync = useCallback(async () => {
    setSyncActivo(true)
    setSyncDescartado(false)
    setSyncResultado(null)
    setSyncError(null)
    try {
      await sincronizarCompleto(forzarCompleto)
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } }
      if (e.response?.status === 409) {
        // Ya hay un sync en progreso — el polling lo detectará al terminar
        return
      }
      // Otro error al lanzar el sync
      setSyncActivo(false)
      setSyncError('No se pudo iniciar el sync. Verifica la conexión.')
    }
  }, [forzarCompleto])

  const mostrarSpinner = syncActivo && !syncDescartado

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60)
    const ss = s % 60
    return m > 0 ? `${m}m ${ss}s` : `${ss}s`
  }

  const metricas: MetricaCardProps[] = [
    {
      titulo: 'Total OV',
      valor: resumen?.total_ov ?? 0,
      descripcion: 'Total de órdenes de venta en el sistema',
      icon: FileText,
      color: 'blue',
      cargando: cargandoResumen,
    },
    {
      titulo: 'Total Líneas',
      valor: resumen?.total_lineas ?? 0,
      descripcion: 'Total de líneas de OV sincronizadas',
      icon: Layers,
      color: 'neutral',
      cargando: cargandoResumen,
    },
    {
      titulo: 'Líneas en Riesgo',
      valor: resumen?.lineas_en_riesgo ?? 0,
      descripcion: 'Líneas con fecha compromiso comprometida',
      icon: AlertTriangle,
      color: 'warning',
      cargando: cargandoResumen,
    },
    {
      titulo: 'Sin Planificación',
      valor: resumen?.lineas_sin_planificacion ?? 0,
      descripcion: 'Líneas abiertas sin cobertura asignada',
      icon: Package,
      color: 'success',
      cargando: cargandoResumen,
    },
    {
      titulo: 'Parcialmente Cubiertas',
      valor: resumen?.lineas_parciales ?? 0,
      descripcion: 'Líneas con cobertura parcial de stock',
      icon: ShoppingCart,
      color: 'neutral',
      cargando: cargandoResumen,
    },
    {
      titulo: 'Totalmente Cubiertas',
      valor: resumen?.lineas_cubiertas ?? 0,
      descripcion: 'Líneas con stock completamente asignado',
      icon: PackageCheck,
      color: 'success',
      cargando: cargandoResumen,
    },
  ]

  const sapConectado = sapStatus?.conectado ?? false
  const ultimoSync = resumen?.ultimo_sync ?? null

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
            Vista general
          </h2>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            Resumen operacional en tiempo real desde SAP Business One
          </p>
        </div>
        <Link
          to="/monitor"
          className={cn(
            'inline-flex items-center gap-2 rounded-pill px-5 py-2.5',
            'bg-brand-black text-[13px] font-medium text-white',
            'transition-all duration-400 ease-out hover:bg-brand-dark-blue',
            'dark:bg-white/10 dark:hover:bg-white/20'
          )}
        >
          Monitor de Negocios
          <ArrowRight size={15} strokeWidth={1.5} />
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metricas.map((m) => (
          <MetricaCard key={m.titulo} {...m} />
        ))}
      </div>

      {/* Panel sincronización SAP */}
      <div className="relative overflow-hidden rounded-[16px] bg-brand-black p-8">
        <div
          className="absolute bottom-0 left-0 h-[2px] w-full"
          style={{ background: 'linear-gradient(to right, #0002FB, #20E0B2, #C80008, #F1A828)' }}
        />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Info columna izquierda */}
          <div>
            <p className="text-[22px] font-semibold text-white">Estado operacional</p>
            <div className="mt-2 flex items-center gap-2 text-[13px] font-light text-white/60">
              <RefreshCw size={13} strokeWidth={1.5} className="shrink-0" />
              <span>Último sync SAP: {formatUltimoSync(ultimoSync)}</span>
            </div>
            {mostrarSpinner && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[12px] text-white/50">
                  En proceso… {formatElapsed(elapsed)}
                </span>
                <button
                  onClick={() => setSyncDescartado(true)}
                  title="Descartar indicador (el sync sigue corriendo en el servidor)"
                  className="flex items-center gap-1 rounded-[6px] bg-white/10 px-2 py-0.5 text-[11px] text-white/50 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X size={10} />
                  Descartar
                </button>
              </div>
            )}
            {syncDescartado && syncActivo && (
              <p className="mt-2 text-[12px] text-white/40">
                El sync sigue corriendo en el servidor. Los datos se actualizarán al terminar.
              </p>
            )}
            {!syncActivo && syncResultado && (
              <SyncResumenPanel data={syncResultado} />
            )}
            {!syncActivo && syncError && (
              <p className="mt-1 max-w-[340px] text-[12px] leading-relaxed text-red-400">
                {syncError}
              </p>
            )}
          </div>

          {/* Columna derecha: estado + controles */}
          <div className="flex flex-col items-end gap-3">
            {/* Indicador de conexión */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-pill px-4 py-2',
                sapConectado ? 'bg-brand-aquamarine/20' : 'bg-semantic-error/20'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 animate-pulse rounded-full',
                  sapConectado ? 'bg-brand-aquamarine' : 'bg-semantic-error'
                )}
              />
              <span
                className={cn(
                  'text-[13px] font-medium',
                  sapConectado ? 'text-brand-aquamarine' : 'text-semantic-error'
                )}
              >
                SAP {sapConectado ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>

            {/* Toggle forzar completo */}
            <label className="flex cursor-pointer items-center gap-2">
              <div
                onClick={() => setForzarCompleto((v) => !v)}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  forzarCompleto ? 'bg-brand-aquamarine' : 'bg-white/20'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    forzarCompleto ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </div>
              <span className="text-[12px] text-white/60">
                {forzarCompleto ? 'Sync completo (todo)' : 'Sync incremental (últimos días)'}
              </span>
            </label>

            {/* Botón sincronizar */}
            <button
              onClick={handleSync}
              disabled={syncActivo || !sapConectado}
              className={cn(
                'flex items-center gap-2 rounded-pill px-5 py-2.5 text-[13px] font-medium transition-all',
                'bg-brand-blue text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              {mostrarSpinner ? (
                <>
                  <RotateCcw size={14} className="animate-spin" />
                  Sincronizando…
                </>
              ) : (
                <>
                  <Play size={14} />
                  Sincronizar SAP
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Estado de integraciones */}
      <div>
        <h3 className="mb-4 text-[22px] font-semibold text-brand-black dark:text-white">
          Estado de integraciones
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              nombre: 'SAP Business One',
              estado: sapStatus
                ? sapConectado
                  ? `Operativo · ${sapStatus.empresa ?? ''}`
                  : sapStatus.mensaje ?? 'Sin conexión'
                : 'Verificando…',
              color: sapStatus
                ? sapConectado
                  ? 'text-semantic-success'
                  : 'text-semantic-error'
                : 'text-brand-steel-blue',
            },
            { nombre: 'CIO 2.0 API', estado: 'Operativo', color: 'text-semantic-success' },
          ].map(({ nombre, estado, color }) => (
            <div
              key={nombre}
              className="flex items-center gap-3 rounded-[10px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue"
            >
              <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', color.replace('text-', 'bg-'))} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-brand-black dark:text-white">{nombre}</p>
                <p className={cn('truncate text-[12px] font-light', color)}>{estado}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compras — accesos rápidos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[22px] font-semibold text-brand-black dark:text-white">Compras</h3>
          <Link
            to="/compras"
            className="text-[13px] text-brand-blue dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver todo <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricaCard
            titulo="Urgentes Pendientes"
            valor={resumenCompras?.urgentes_pendientes ?? 0}
            descripcion={resumenCompras ? `$${new Intl.NumberFormat('es-CL').format(resumenCompras.valor_urgente)}` : 'Sin datos'}
            icon={AlertTriangle}
            color="warning"
            cargando={!resumenCompras}
          />
          <MetricaCard
            titulo="Programadas Pendientes"
            valor={resumenCompras?.programadas_pendientes ?? 0}
            descripcion={resumenCompras ? `$${new Intl.NumberFormat('es-CL').format(resumenCompras.valor_programado)}` : 'Sin datos'}
            icon={Clock}
            color="neutral"
            cargando={!resumenCompras}
          />
          <MetricaCard
            titulo="Valor Anticipado DMI"
            valor={resumenCompras ? `$${new Intl.NumberFormat('es-CL').format(resumenCompras.valor_total_pendiente)}` : '—'}
            descripcion="Valor total sugerencias pendientes"
            icon={TrendingDown}
            color="blue"
            cargando={!resumenCompras}
          />
        </div>
      </div>

      {/* Facturación — accesos rápidos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[22px] font-semibold text-brand-black dark:text-white">Facturación</h3>
          <Link
            to="/facturacion"
            className="text-[13px] text-brand-blue dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Ver pipeline <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricaCard
            titulo="Facturable Hoy"
            valor={
              resumenFacturacion
                ? `$${new Intl.NumberFormat('es-CL').format(resumenFacturacion.facturable_hoy.monto)}`
                : '—'
            }
            descripcion={`${resumenFacturacion?.facturable_hoy.count ?? 0} ítems listos para facturar`}
            icon={DollarSign}
            color="success"
            cargando={!resumenFacturacion}
          />
          <MetricaCard
            titulo="Próximos 30 días"
            valor={
              resumenFacturacion
                ? `$${new Intl.NumberFormat('es-CL').format(resumenFacturacion.facturable_30_dias.monto)}`
                : '—'
            }
            descripcion={`${resumenFacturacion?.facturable_30_dias.count ?? 0} ítems proyectados`}
            icon={Calendar}
            color="blue"
            cargando={!resumenFacturacion}
          />
          <Link to="/facturacion?tab=bloqueos" className="block">
            <MetricaCard
              titulo="Monto Bloqueado"
              valor={
                resumenFacturacion
                  ? `$${new Intl.NumberFormat('es-CL').format(resumenFacturacion.bloqueado.monto)}`
                  : '—'
              }
              descripcion={`${resumenFacturacion?.bloqueado.count ?? 0} ítems con bloqueo activo`}
              icon={Lock}
              color="warning"
              cargando={!resumenFacturacion}
            />
          </Link>
        </div>
      </div>
    </div>
  )
}
