import { ShoppingCart, Package, AlertTriangle, FileText, ArrowRight, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useResumenDashboard } from '@/hooks/useOrdenes'
import { getEstadoSAP } from '@/api/sap'
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
      bg: 'bg-brand-blue/10 dark:bg-brand-blue/20',
      icon: 'text-brand-blue',
      border: 'border-brand-blue/20',
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
      icon: 'text-brand-steel-blue',
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

export default function Dashboard() {
  const { data: resumen, isLoading: cargandoResumen } = useResumenDashboard()

  const { data: sapStatus } = useQuery({
    queryKey: ['sap-status'],
    queryFn: getEstadoSAP,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: QUERY_STALE_TIME,
    retry: false,
  })

  const metricas: MetricaCardProps[] = [
    {
      titulo: 'OV Abiertas',
      valor: resumen?.total_ov_abiertas ?? 0,
      descripcion: 'Órdenes de venta activas en el sistema',
      icon: FileText,
      color: 'blue',
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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map((m) => (
          <MetricaCard key={m.titulo} {...m} />
        ))}
      </div>

      {/* Banner de estado SAP */}
      <div className="relative overflow-hidden rounded-[16px] bg-brand-black p-8">
        <div
          className="absolute bottom-0 left-0 h-[2px] w-full"
          style={{ background: 'linear-gradient(to right, #0002FB, #20E0B2, #C80008, #F1A828)' }}
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[22px] font-semibold text-white">Estado operacional</p>
            <div className="mt-2 flex items-center gap-2 text-[13px] font-light text-white/60">
              <RefreshCw size={13} strokeWidth={1.5} className="shrink-0" />
              <span>Último sync SAP: {formatUltimoSync(ultimoSync)}</span>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-2 rounded-pill px-4 py-2',
              sapConectado
                ? 'bg-brand-aquamarine/20'
                : 'bg-semantic-error/20'
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
        </div>
      </div>

      {/* Estado de integraciones */}
      <div>
        <h3 className="mb-4 text-[22px] font-semibold text-brand-black dark:text-white">
          Estado de integraciones
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            { nombre: 'HubSpot CRM', estado: 'Pendiente Sprint 2', color: 'text-semantic-warning' },
            { nombre: 'WMS Oracle', estado: 'Pendiente Sprint 3', color: 'text-brand-steel-blue' },
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
    </div>
  )
}
