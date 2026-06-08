import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Zap, Clock, AlertTriangle, ShoppingCart, TrendingUp, XCircle, Calendar, RefreshCw, Settings,
} from 'lucide-react'
import {
  getResumenATP,
  ejecutarATP,
  getConfiguracionATP,
  patchConfiguracionATP,
  getEjecuciones,
} from '@/api/atp'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { ModoATP, EjecucionATP } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

const ESTADO_META: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  a_tiempo: {
    label: 'A tiempo',
    color: 'text-semantic-success dark:text-emerald-400',
    bgColor: 'bg-semantic-success/10 dark:bg-emerald-400/10',
    borderColor: 'border-semantic-success/20 dark:border-emerald-400/20',
    icon: Clock,
  },
  en_riesgo: {
    label: 'En riesgo',
    color: 'text-semantic-warning dark:text-amber-400',
    bgColor: 'bg-semantic-warning/10 dark:bg-amber-400/10',
    borderColor: 'border-semantic-warning/20 dark:border-amber-400/20',
    icon: AlertTriangle,
  },
  comprar_ya: {
    label: 'Comprar ya',
    color: 'text-semantic-error dark:text-red-400',
    bgColor: 'bg-semantic-error/10 dark:bg-red-400/10',
    borderColor: 'border-semantic-error/20 dark:border-red-400/20',
    icon: ShoppingCart,
  },
  comprar_pronto: {
    label: 'Comprar pronto',
    color: 'text-[#F1A828] dark:text-yellow-400',
    bgColor: 'bg-[#F1A828]/10 dark:bg-yellow-400/10',
    borderColor: 'border-[#F1A828]/20 dark:border-yellow-400/20',
    icon: TrendingUp,
  },
  no_comprar_aun: {
    label: 'No comprar aún',
    color: 'text-brand-blue dark:text-blue-400',
    bgColor: 'bg-brand-blue/10',
    borderColor: 'border-brand-blue/20',
    icon: Calendar,
  },
  sin_cobertura: {
    label: 'Sin cobertura',
    color: 'text-brand-steel-blue dark:text-white/60',
    bgColor: 'bg-brand-alice-blue dark:bg-white/5',
    borderColor: 'border-brand-alice-blue dark:border-white/10',
    icon: XCircle,
  },
  sin_fecha: {
    label: 'Sin fecha',
    color: 'text-brand-steel-blue dark:text-white/40',
    bgColor: 'bg-brand-alice-blue dark:bg-white/5',
    borderColor: 'border-brand-alice-blue dark:border-white/10',
    icon: Calendar,
  },
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatCLP(valor: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(valor)
}

// ─── sub-components ──────────────────────────────────────────────────────────

function EstadoCard({
  clave, valor, cargando,
}: {
  clave: string; valor: number; cargando: boolean
}) {
  const meta = ESTADO_META[clave]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <div
      className={cn(
        'rounded-[16px] border bg-white p-5 shadow-sm transition-all duration-400 dark:bg-brand-dark-blue dark:shadow-none',
        meta.borderColor
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
            {meta.label}
          </p>
          {cargando ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded-[8px] bg-brand-alice-blue dark:bg-white/10" />
          ) : (
            <p className={cn('mt-1 text-[36px] font-semibold leading-none', meta.color)}>{valor}</p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-[12px]', meta.bgColor)}>
          <Icon size={20} strokeWidth={1.5} className={meta.color} />
        </div>
      </div>
    </div>
  )
}

function EjecucionRow({ e }: { e: EjecucionATP }) {
  return (
    <div className="flex items-center gap-4 rounded-[10px] border border-brand-alice-blue bg-white p-4 text-[13px] dark:border-white/10 dark:bg-brand-dark-blue">
      <div className="w-24 shrink-0">
        <span className={cn(
          'inline-block rounded-pill px-2 py-0.5 text-[11px] font-medium',
          e.modo_usado === 'ESTANDAR' ? 'bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50' :
          e.modo_usado === 'OPTIMO' ? 'bg-brand-blue/10 text-brand-blue dark:text-blue-400' :
          'bg-[#F1A828]/10 text-[#F1A828]'
        )}>
          {e.modo_usado}
        </span>
      </div>
      <div className="flex-1 text-brand-blue-gray dark:text-white/50">
        {formatFecha(e.iniciado_en)}
      </div>
      <div className="w-20 text-right text-brand-black dark:text-white">
        {e.lineas_procesadas} líneas
      </div>
      <div className="w-24 text-right text-semantic-success dark:text-emerald-400">{e.lineas_a_tiempo} ok</div>
      <div className="w-24 text-right text-semantic-error dark:text-red-400">{e.lineas_comprar_ya} urgentes</div>
      <div className="w-16 text-right text-brand-blue-gray dark:text-white/40">
        {e.duracion_segundos ? `${e.duracion_segundos}s` : '—'}
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function MotorATP() {
  const queryClient = useQueryClient()

  const { data: resumen, isLoading: cargandoResumen } = useQuery({
    queryKey: ['atp-resumen'],
    queryFn: () => getResumenATP(),
  })

  const { data: config, isLoading: cargandoConfig } = useQuery({
    queryKey: ['atp-configuracion'],
    queryFn: () => getConfiguracionATP(),
  })

  const { data: ejecuciones } = useQuery({
    queryKey: ['atp-ejecuciones'],
    queryFn: () => getEjecuciones(),
  })

  const ejecutarMutation = useMutation({
    mutationFn: () => ejecutarATP(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atp-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['atp-ejecuciones'] })
    },
  })

  const [editandoConfig, setEditandoConfig] = useState(false)
  const [configLocal, setConfigLocal] = useState<Partial<{ modo_activo: ModoATP; dias_urgente: number; dias_comprar_pronto: number; peso_fecha_compromiso: number; peso_cliente_vip: number; peso_lead_time: number }>>({})

  const patchMutation = useMutation({
    mutationFn: (payload: Parameters<typeof patchConfiguracionATP>[0]) => patchConfiguracionATP(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atp-configuracion'] })
      setEditandoConfig(false)
      setConfigLocal({})
    },
  })

  const estadosKeys = ['a_tiempo', 'en_riesgo', 'comprar_ya', 'comprar_pronto', 'no_comprar_aun', 'sin_cobertura', 'sin_fecha'] as const

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
            Motor ATP
          </h2>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            Available to Promise — análisis de fechas y urgencia de compra
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => ejecutarMutation.mutate()}
            disabled={ejecutarMutation.isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-pill px-5 py-2.5',
              'bg-brand-black text-[13px] font-medium text-white',
              'transition-all duration-400 ease-out hover:bg-brand-dark-blue active:scale-[0.98]',
              'dark:bg-white/10 dark:hover:bg-white/20',
              'disabled:opacity-50'
            )}
          >
            {ejecutarMutation.isPending
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <Zap size={15} strokeWidth={1.5} />
            }
            {ejecutarMutation.isPending ? 'Calculando…' : 'Ejecutar ATP'}
          </button>
        </div>
      </div>

      {/* Resultado de ejecución */}
      {ejecutarMutation.isSuccess && (
        <div className="rounded-[12px] border border-semantic-success/30 bg-semantic-success/10 p-4 text-[13px] text-semantic-success">
          ATP calculado — {String(ejecutarMutation.data?.lineas_procesadas ?? 0)} líneas procesadas en {String(ejecutarMutation.data?.duracion_segundos ?? 0)}s
        </div>
      )}
      {ejecutarMutation.isError && (
        <div className="rounded-[12px] border border-semantic-error/30 bg-semantic-error/10 p-4 text-[13px] text-semantic-error">
          Error al ejecutar ATP. Revisa la consola del servidor.
        </div>
      )}

      {/* Modo activo + último cálculo */}
      {!cargandoResumen && resumen && (
        <div className="flex flex-wrap items-center gap-4 rounded-[12px] border border-brand-alice-blue bg-white px-5 py-3 dark:border-white/10 dark:bg-brand-dark-blue">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
              Modo activo
            </span>
            <span className="rounded-pill bg-brand-black px-3 py-1 text-[12px] font-medium text-white dark:bg-white/10">
              {resumen.modo_activo}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] font-light text-brand-blue-gray dark:text-white/40">
            <RefreshCw size={12} strokeWidth={1.5} />
            Último cálculo: {formatFecha(resumen.ultimo_calculo)}
          </div>
          {resumen.valor_en_riesgo > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] font-light text-brand-blue-gray dark:text-white/50">
                Valor urgente a comprar:
              </span>
              <span className="text-[14px] font-semibold text-semantic-error dark:text-red-400">
                {formatCLP(resumen.valor_en_riesgo + resumen.valor_comprar_pronto)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid de estados ATP */}
      {cargandoResumen ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {estadosKeys.map((clave) => (
            <EstadoCard
              key={clave}
              clave={clave}
              valor={resumen?.[clave] ?? 0}
              cargando={cargandoResumen}
            />
          ))}
        </div>
      )}

      {/* Configuración ATP */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[20px] font-semibold text-brand-black dark:text-white">
            Configuración del Motor
          </h3>
          {!editandoConfig && (
            <button
              onClick={() => {
                setConfigLocal({
                  modo_activo: config?.modo_activo ?? 'ESTANDAR',
                  dias_urgente: config?.dias_urgente ?? 7,
                  dias_comprar_pronto: config?.dias_comprar_pronto ?? 15,
                  peso_fecha_compromiso: config?.peso_fecha_compromiso ?? 50,
                  peso_cliente_vip: config?.peso_cliente_vip ?? 30,
                  peso_lead_time: config?.peso_lead_time ?? 20,
                })
                setEditandoConfig(true)
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-pill px-4 py-2',
                'border border-brand-alice-blue bg-white text-[13px] font-medium text-brand-black',
                'dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
                'transition-all duration-400 hover:border-brand-blue/30'
              )}
            >
              <Settings size={14} strokeWidth={1.5} />
              Editar
            </button>
          )}
        </div>

        {cargandoConfig ? (
          <div className="h-24 animate-pulse rounded-[12px] bg-brand-alice-blue dark:bg-white/5" />
        ) : editandoConfig ? (
          <div className="rounded-[16px] border border-brand-alice-blue bg-white p-6 dark:border-white/10 dark:bg-brand-dark-blue">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                  Modo activo
                </label>
                <select
                  value={configLocal.modo_activo ?? 'ESTANDAR'}
                  onChange={(e) => setConfigLocal((p) => ({ ...p, modo_activo: e.target.value as ModoATP }))}
                  className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                >
                  <option value="ESTANDAR">Estándar — FIFO</option>
                  <option value="OPTIMO">Óptimo — fecha compromiso</option>
                  <option value="DINAMICO">Dinámico — scoring</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                  Alerta urgente si faltan menos de (días)
                </label>
                <input
                  type="number" min={1} max={30}
                  value={configLocal.dias_urgente ?? 7}
                  onChange={(e) => setConfigLocal((p) => ({ ...p, dias_urgente: Number(e.target.value) }))}
                  className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                />
                <p className="mt-1 text-[11px] text-brand-blue-gray dark:text-white/30">
                  Si la fecha compromiso está a menos de este número de días → urgente
                </p>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                  Avisar "Comprar pronto" si faltan menos de (días)
                </label>
                <input
                  type="number" min={1} max={60}
                  value={configLocal.dias_comprar_pronto ?? 15}
                  onChange={(e) => setConfigLocal((p) => ({ ...p, dias_comprar_pronto: Number(e.target.value) }))}
                  className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                />
                <p className="mt-1 text-[11px] text-brand-blue-gray dark:text-white/30">
                  Si la fecha sugerida de compra está a menos de este número de días → COMPRAR_PRONTO
                </p>
              </div>

              {configLocal.modo_activo === 'DINAMICO' && (
                <>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                      Prioridad por urgencia de fecha (0–100)
                    </label>
                    <input
                      type="number" min={0} max={100}
                      value={configLocal.peso_fecha_compromiso ?? 50}
                      onChange={(e) => setConfigLocal((p) => ({ ...p, peso_fecha_compromiso: Number(e.target.value) }))}
                      className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-brand-blue-gray dark:text-white/30">
                      Qué tan importante es que la fecha compromiso esté próxima
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                      Prioridad por cliente VIP (0–100)
                    </label>
                    <input
                      type="number" min={0} max={100}
                      value={configLocal.peso_cliente_vip ?? 30}
                      onChange={(e) => setConfigLocal((p) => ({ ...p, peso_cliente_vip: Number(e.target.value) }))}
                      className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-brand-blue-gray dark:text-white/30">
                      Pon 0 si no quieres que el ser VIP dé ventaja
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-brand-blue-gray dark:text-white/50">
                      Prioridad por lead time largo (0–100)
                    </label>
                    <input
                      type="number" min={0} max={100}
                      value={configLocal.peso_lead_time ?? 20}
                      onChange={(e) => setConfigLocal((p) => ({ ...p, peso_lead_time: Number(e.target.value) }))}
                      className="w-full rounded-[10px] border border-brand-alice-blue bg-white px-3 py-2 text-[13px] dark:border-white/10 dark:bg-brand-black dark:text-white"
                    />
                    <p className="mt-1 text-[11px] text-brand-blue-gray dark:text-white/30">
                      Pon 0 si no importa cuánto tarda el proveedor en entregar
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setEditandoConfig(false); setConfigLocal({}) }}
                className="rounded-pill border border-brand-alice-blue px-4 py-2 text-[13px] font-medium text-brand-blue-gray dark:border-white/10 dark:text-white/50"
              >
                Cancelar
              </button>
              <button
                disabled={patchMutation.isPending}
                onClick={() => {
                  const empresa = config?.empresa_db ?? ''
                  patchMutation.mutate({ empresa_db: empresa, ...configLocal })
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-pill bg-brand-black px-5 py-2 text-[13px] font-medium text-white',
                  'transition-all duration-400 hover:bg-brand-dark-blue disabled:opacity-50',
                  'dark:bg-white/10 dark:hover:bg-white/20'
                )}
              >
                {patchMutation.isPending
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : null
                }
                Guardar
              </button>
            </div>
          </div>
        ) : config ? (
          <div className="rounded-[16px] border border-brand-alice-blue bg-white p-6 dark:border-white/10 dark:bg-brand-dark-blue">
            {config._es_default && (
              <p className="mb-4 text-[12px] text-brand-blue-gray dark:text-white/40">
                Usando valores por defecto — presiona Editar para guardar tu propia configuración.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 text-center">
              {[
                { label: 'Modo', valor: config.modo_activo },
                { label: 'Días urgente', valor: `${config.dias_urgente} días` },
                { label: 'Ventana pronto', valor: `${config.dias_comprar_pronto} días` },
                { label: 'Peso fecha', valor: `${config.peso_fecha_compromiso}%` },
                { label: 'Peso VIP', valor: `${config.peso_cliente_vip}%` },
              ].map(({ label, valor }) => (
                <div key={label} className="flex flex-col gap-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/40">
                    {label}
                  </p>
                  <p className="text-[15px] font-semibold text-brand-black dark:text-white">{valor}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Historial de ejecuciones */}
      {ejecuciones?.results && ejecuciones.results.length > 0 && (
        <div>
          <h3 className="mb-4 text-[20px] font-semibold text-brand-black dark:text-white">
            Historial de ejecuciones
          </h3>
          <div className="flex flex-col gap-2">
            {ejecuciones.results.slice(0, 10).map((e) => (
              <EjecucionRow key={e.id} e={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
