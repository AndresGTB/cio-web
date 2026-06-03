import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  Warehouse,
  Ship,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFecha, formatDecimal } from '@/lib/utils'
import { useReservasPorLinea } from '@/hooks/useInventario'
import { liberarReserva } from '@/api/reservas'
import type { LineaOVDetallada, Reserva, TipoFacturacion } from '@/types'

// ------------------------------------------------------------------ //
// Barra tricolor de cobertura
// ------------------------------------------------------------------ //

interface CoberturaBarProps {
  openQty: number
  qtyBodega: number
  qtyTransito: number
  qtyPendiente: number
  unidad: string
  grande?: boolean
}

export function CoberturaBar({
  openQty,
  qtyBodega,
  qtyTransito,
  qtyPendiente,
  unidad,
  grande = false,
}: CoberturaBarProps) {
  if (openQty <= 0)
    return <span className="text-[12px] text-brand-blue-gray">—</span>

  const pct = (v: number) => Math.min(100, Math.max(0, (v / openQty) * 100))
  const pBodega = pct(qtyBodega)
  const pTransito = pct(qtyTransito)
  const pPendiente = pct(qtyPendiente)

  const h = grande ? 'h-3' : 'h-2'

  return (
    <div className="flex flex-col gap-1">
      {/* Barra */}
      <div className={cn('w-full overflow-hidden rounded-full bg-brand-alice-blue dark:bg-white/10', h)}>
        <div className="flex h-full">
          {pBodega > 0 && (
            <div
              className="h-full bg-semantic-success transition-all duration-700"
              style={{ width: `${pBodega}%` }}
            />
          )}
          {pTransito > 0 && (
            <div
              className="h-full bg-brand-blue transition-all duration-700"
              style={{ width: `${pTransito}%` }}
            />
          )}
          {pPendiente > 0 && (
            <div
              className="h-full bg-semantic-error/60 transition-all duration-700"
              style={{ width: `${pPendiente}%` }}
            />
          )}
        </div>
      </div>

      {/* Leyenda numérica */}
      {grande && (
        <div className="flex gap-3 text-[12px] font-light">
          <span className="flex items-center gap-1 text-semantic-success">
            <Warehouse size={11} strokeWidth={1.5} />
            {formatDecimal(qtyBodega, 0)} {unidad}
          </span>
          <span className="flex items-center gap-1 text-brand-blue">
            <Ship size={11} strokeWidth={1.5} />
            {formatDecimal(qtyTransito, 0)} {unidad}
          </span>
          <span className="flex items-center gap-1 text-semantic-error/80">
            <ShoppingCart size={11} strokeWidth={1.5} />
            {formatDecimal(qtyPendiente, 0)} {unidad}
          </span>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Mini-dialog de confirmación para liberar reserva
// ------------------------------------------------------------------ //

interface ConfirmarLiberarProps {
  reserva: Reserva
  onConfirmar: (motivo: string) => void
  onCancelar: () => void
  cargando: boolean
}

function ConfirmarLiberar({ reserva, onConfirmar, onCancelar, cargando }: ConfirmarLiberarProps) {
  const [motivo, setMotivo] = useState('')

  return (
    <div className="mt-2 rounded-[12px] border border-semantic-error/30 bg-semantic-error/5 p-4">
      <p className="mb-2 text-[13px] font-medium text-brand-black dark:text-white">
        Motivo para liberar {reserva.origen === 'BODEGA' ? 'reserva de bodega' : 'reserva de tránsito'}
      </p>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Describe el motivo de liberación (requerido)..."
        rows={2}
        className={cn(
          'w-full resize-none rounded-[8px] border border-brand-alice-blue p-2.5',
          'text-[13px] font-light text-brand-black outline-none',
          'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
          'transition-all duration-400 focus:border-semantic-error/60',
          'placeholder:text-brand-steel-blue/60'
        )}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => motivo.trim() && onConfirmar(motivo.trim())}
          disabled={!motivo.trim() || cargando}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-[8px] px-3 text-[12px] font-medium',
            'bg-semantic-error text-white transition-all duration-400',
            'hover:bg-semantic-error/80 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {cargando ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
          Confirmar liberación
        </button>
        <button
          onClick={onCancelar}
          disabled={cargando}
          className={cn(
            'flex h-7 items-center rounded-[8px] px-3 text-[12px] font-medium',
            'border border-brand-alice-blue text-brand-blue-gray',
            'bg-white transition-all duration-400 hover:border-brand-black hover:text-brand-black',
            'dark:border-white/10 dark:bg-transparent dark:text-white/50'
          )}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Badge de tipo de facturación
// ------------------------------------------------------------------ //

const TIPO_FACT_CONFIG: Record<TipoFacturacion, { label: string; className: string }> = {
  ESTANDAR: { label: 'Estándar', className: 'bg-brand-alice-blue text-brand-steel-blue' },
  ANTICIPO: { label: 'Anticipo', className: 'bg-amber-100 text-amber-700' },
  HITO: { label: 'Hito', className: 'bg-purple-100 text-purple-700' },
  ERROR: { label: 'Error facturación', className: 'bg-red-100 text-red-700' },
}

// ------------------------------------------------------------------ //
// Componente principal — Sheet lateral
// ------------------------------------------------------------------ //

interface Props {
  linea: LineaOVDetallada | null
  onClose: () => void
}

export default function DetalleLinea({ linea, onClose }: Props) {
  const queryClient = useQueryClient()
  const [liberandoId, setLiberandoId] = useState<number | null>(null)

  const { data: detalleData, isLoading: cargandoReservas } = useReservasPorLinea(linea?.id ?? 0)

  const liberarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => liberarReserva(id, motivo),
    onSuccess: () => {
      setLiberandoId(null)
      void queryClient.invalidateQueries({ queryKey: ['reservas-linea', linea?.id] })
      void queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
    },
  })

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!linea) return null

  const openQty = Number(linea.open_qty_sap ?? linea.cantidad_pendiente ?? 0)
  const qtyBodega = Number(linea.qty_bodega ?? 0)
  const qtyTransito = Number(linea.qty_transito ?? 0)
  const qtyPendiente = Number(linea.qty_pendiente_compra ?? 0)
  const tipoFact = TIPO_FACT_CONFIG[linea.tipo_facturacion] ?? TIPO_FACT_CONFIG.ESTANDAR

  const reservasActivas = detalleData?.reservas?.filter((r: Reserva) => r.estado === 'ACTIVA') ?? []

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-brand-black/40 backdrop-blur-[2px] transition-opacity duration-400"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col',
          'bg-white shadow-2xl dark:bg-brand-dark-blue',
          'animate-slide-in overflow-hidden'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de línea"
      >
        {/* Header del panel */}
        <div className="flex items-center justify-between border-b border-brand-alice-blue px-6 py-4 dark:border-white/10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
              Línea {linea.numero_linea}
            </p>
            <h3 className="text-[20px] font-semibold text-brand-black dark:text-white">
              OV {linea.numero_ov}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-[8px]',
              'text-brand-blue-gray transition-all duration-400',
              'hover:bg-brand-alice-blue hover:text-brand-black',
              'dark:hover:bg-white/10 dark:hover:text-white'
            )}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Sección: Datos del negocio */}
          <section>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40">
              Datos del negocio
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">Cliente</dt>
                <dd className="text-[13px] font-medium text-brand-black dark:text-white">{linea.cliente_nombre}</dd>
                <dd className="text-[11px] text-brand-steel-blue dark:text-white/40">{linea.cliente_id}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">F. Compromiso OV</dt>
                <dd className="text-[13px] text-brand-black dark:text-white">
                  {linea.fecha_compromiso_ov ? formatFecha(linea.fecha_compromiso_ov) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">SKU</dt>
                <dd className="text-[13px] font-medium text-brand-black dark:text-white">{linea.sku}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">F. Compromiso Línea</dt>
                <dd className="text-[13px] text-brand-black dark:text-white">
                  {linea.fecha_compromiso_linea ? formatFecha(linea.fecha_compromiso_linea) : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">Descripción</dt>
                <dd className="text-[13px] text-brand-black dark:text-white">{linea.descripcion}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">Bodega</dt>
                <dd className="text-[13px] text-brand-black dark:text-white">{linea.bodega || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-brand-steel-blue dark:text-white/40">Facturación</dt>
                <dd>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium',
                      tipoFact.className
                    )}
                  >
                    {tipoFact.label}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          {/* Sección: Cobertura */}
          <section>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40">
              Cobertura de stock
            </h4>
            <div className="rounded-[12px] border border-brand-alice-blue bg-brand-alice-blue/30 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-[28px] font-semibold text-brand-black dark:text-white">
                  {formatDecimal(openQty, 0)}
                </span>
                <span className="text-[14px] font-light text-brand-blue-gray dark:text-white/50">
                  {linea.unidad} pendientes
                </span>
              </div>
              <CoberturaBar
                openQty={openQty}
                qtyBodega={qtyBodega}
                qtyTransito={qtyTransito}
                qtyPendiente={qtyPendiente}
                unidad={linea.unidad}
                grande
              />
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Bodega',
                    value: qtyBodega,
                    icon: Warehouse,
                    color: 'text-semantic-success',
                    bg: 'bg-semantic-success/10',
                  },
                  {
                    label: 'Tránsito / OC',
                    value: qtyTransito,
                    icon: Ship,
                    color: 'text-brand-blue',
                    bg: 'bg-brand-blue/10',
                  },
                  {
                    label: 'Pendiente compra',
                    value: qtyPendiente,
                    icon: ShoppingCart,
                    color: 'text-semantic-error',
                    bg: 'bg-semantic-error/10',
                  },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className={cn('rounded-[10px] p-3', bg)}>
                    <Icon size={16} strokeWidth={1.5} className={cn('mb-1', color)} />
                    <p className={cn('text-[20px] font-semibold', color)}>
                      {formatDecimal(value, 0)}
                    </p>
                    <p className="text-[11px] font-light text-brand-blue-gray dark:text-white/50">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Sección: Reservas activas */}
          <section>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-blue-gray dark:text-white/40">
              Reservas activas
            </h4>

            {cargandoReservas && (
              <div className="flex items-center gap-2 text-[13px] text-brand-blue-gray dark:text-white/40">
                <Loader2 size={14} className="animate-spin" />
                Cargando reservas...
              </div>
            )}

            {!cargandoReservas && reservasActivas.length === 0 && (
              <div className="flex items-center gap-2 rounded-[10px] border border-brand-alice-blue bg-brand-alice-blue/30 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <AlertTriangle size={14} strokeWidth={1.5} className="text-brand-steel-blue" />
                <span className="text-[13px] font-light text-brand-blue-gray dark:text-white/50">
                  Sin reservas activas para esta línea
                </span>
              </div>
            )}

            {!cargandoReservas && reservasActivas.length > 0 && (
              <div className="space-y-2">
                {reservasActivas.map((reserva) => (
                  <div
                    key={reserva.id}
                    className="rounded-[10px] border border-brand-alice-blue bg-white p-3 dark:border-white/10 dark:bg-brand-dark-blue/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {reserva.origen === 'BODEGA' ? (
                          <Warehouse size={15} strokeWidth={1.5} className="text-semantic-success" />
                        ) : (
                          <Ship size={15} strokeWidth={1.5} className="text-brand-blue" />
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-brand-black dark:text-white">
                            {reserva.origen === 'BODEGA' ? 'Reserva bodega' : 'Reserva tránsito'}
                          </p>
                          <p className="text-[11px] text-brand-steel-blue dark:text-white/40">
                            {formatDecimal(Number(reserva.cantidad), 0)} {linea.unidad} · {formatFecha(reserva.creada_en)}
                          </p>
                          {reserva.origen === 'TRANSITO' && reserva.linea_oc_detalle && (
                            <p className="mt-0.5 text-[11px] text-brand-blue dark:text-brand-blue/80">
                              OC {reserva.linea_oc_detalle.numero_oc} · {reserva.linea_oc_detalle.proveedor_nombre}
                              {reserva.linea_oc_detalle.fecha_entrega && (
                                <> · entrega {formatFecha(reserva.linea_oc_detalle.fecha_entrega)}</>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setLiberandoId(liberandoId === reserva.id ? null : reserva.id)}
                        disabled={liberarMutation.isPending}
                        className={cn(
                          'flex h-7 items-center gap-1 rounded-[8px] border px-2.5 text-[12px] font-medium',
                          'border-semantic-error/30 text-semantic-error',
                          'bg-semantic-error/5 transition-all duration-400 hover:bg-semantic-error/10',
                          'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                      >
                        Liberar
                      </button>
                    </div>

                    {liberandoId === reserva.id && (
                      <ConfirmarLiberar
                        reserva={reserva}
                        cargando={liberarMutation.isPending}
                        onConfirmar={(motivo) => liberarMutation.mutate({ id: reserva.id, motivo })}
                        onCancelar={() => setLiberandoId(null)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Último sync */}
          {linea.ultimo_sync_sap && (
            <p className="text-[11px] font-light text-brand-steel-blue/60 dark:text-white/30">
              Último sync SAP: {formatFecha(linea.ultimo_sync_sap)}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
