import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, X, ChevronLeft, ChevronRight,
  Warehouse, Ship, PackageCheck, PackageOpen, AlertTriangle,
  Activity, List,
} from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { cn } from '@/lib/utils'
import { formatFecha, formatDecimal } from '@/lib/utils'
import { useReservas } from '@/hooks/useInventario'
import { liberarReserva } from '@/api/reservas'
import { useDebounce } from '@/hooks/useDebounce'
import type { Reserva } from '@/types'

// ------------------------------------------------------------------ //
// Badge origen / estado
// ------------------------------------------------------------------ //

function OrigenBadge({ origen }: { origen: 'BODEGA' | 'TRANSITO' | 'FACTURA_RESERVA' }) {
  if (origen === 'BODEGA') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-semantic-success/10 px-2 py-0.5 text-[11px] font-medium text-semantic-success">
      <Warehouse size={10} strokeWidth={2} />
      Bodega
    </span>
  )
  if (origen === 'FACTURA_RESERVA') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
      <Ship size={10} strokeWidth={2} />
      Fact. Reserva
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-medium text-brand-blue dark:bg-blue-400/10 dark:text-blue-400">
      <Ship size={10} strokeWidth={2} />
      Tránsito
    </span>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  return estado === 'ACTIVA' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-semantic-success/10 px-2 py-0.5 text-[11px] font-medium text-semantic-success">
      <PackageCheck size={10} strokeWidth={2} />
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-alice-blue px-2 py-0.5 text-[11px] font-medium text-brand-blue-gray dark:bg-white/10 dark:text-white/40">
      <PackageOpen size={10} strokeWidth={2} />
      Liberada
    </span>
  )
}

// ------------------------------------------------------------------ //
// Dialog de liberación inline
// ------------------------------------------------------------------ //

interface ConfirmarLiberarProps {
  reserva: Reserva
  onConfirm: (motivo: string) => void
  onCancel: () => void
  isPending: boolean
}

function ConfirmarLiberar({ reserva, onConfirm, onCancel, isPending }: ConfirmarLiberarProps) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[420px] rounded-[16px] border border-brand-alice-blue bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-warning/10">
            <AlertTriangle size={16} className="text-semantic-warning" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-brand-black dark:text-white">
              Liberar reserva
            </p>
            <p className="mt-0.5 text-[13px] font-light text-brand-blue-gray dark:text-white/50">
              SKU <span className="font-medium text-brand-black dark:text-white">{reserva.sku}</span>
              {' · '}{formatDecimal(Number(reserva.cantidad), 0)} un · {reserva.origen}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[12px] font-medium text-brand-blue-gray dark:text-white/50 mb-1">
            Motivo (obligatorio)
          </label>
          <textarea
            rows={2}
            autoFocus
            placeholder="Ej: Stock reasignado, cancelación de OV..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={cn(
              'w-full resize-none rounded-[10px] border border-brand-alice-blue px-3 py-2',
              'text-[13px] font-light text-brand-black outline-none',
              'bg-brand-alice-blue/30 dark:border-white/10 dark:bg-white/5 dark:text-white',
              'transition-all duration-400 focus:border-[#73B8EF]',
              'placeholder:text-brand-steel-blue/60'
            )}
          />
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="h-9 rounded-[8px] border border-brand-alice-blue px-4 text-[13px] font-medium text-brand-blue-gray hover:border-brand-black dark:border-white/10 dark:text-white/50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim() || isPending}
            className="h-9 rounded-[8px] bg-semantic-error px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Liberando...' : 'Liberar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Fila de reserva
// ------------------------------------------------------------------ //

interface ReservaRowProps {
  reserva: Reserva
  onLiberar: () => void
}

function ReservaRow({ reserva, onLiberar }: ReservaRowProps) {
  const oc = reserva.linea_oc_detalle

  return (
    <tr className="border-b border-brand-alice-blue/50 transition-colors hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5">
      {/* SKU */}
      <td className="px-4 py-3">
        <span className="font-medium text-brand-black dark:text-white">{reserva.sku}</span>
        {reserva.sku_descripcion && (
          <>
            <br />
            <span className="text-[11px] text-brand-steel-blue dark:text-white/40">
              {reserva.sku_descripcion.length > 40
                ? reserva.sku_descripcion.slice(0, 40) + '…'
                : reserva.sku_descripcion}
            </span>
          </>
        )}
      </td>

      {/* OV / Cliente */}
      <td className="px-4 py-3">
        <span className="font-medium text-brand-black dark:text-white">{reserva.numero_ov}</span>
        {reserva.fecha_documento_ov && (
          <span className="ml-1.5 text-[10px] text-brand-blue-gray dark:text-white/30">
            {formatFecha(reserva.fecha_documento_ov)}
          </span>
        )}
        {reserva.cliente_nombre && (
          <>
            <br />
            <span className="text-[11px] text-brand-steel-blue dark:text-white/40">
              {reserva.cliente_nombre.length > 30
                ? reserva.cliente_nombre.slice(0, 30) + '…'
                : reserva.cliente_nombre}
            </span>
          </>
        )}
      </td>

      {/* Bodega */}
      <td className="px-4 py-3">
        <span className="rounded-[8px] bg-brand-alice-blue px-2 py-0.5 text-[12px] font-medium text-brand-steel-blue dark:bg-white/10 dark:text-white/60">
          {reserva.bodega_codigo}
        </span>
      </td>

      {/* Origen */}
      <td className="px-4 py-3">
        <OrigenBadge origen={reserva.origen} />
      </td>

      {/* Cantidad */}
      <td className="px-4 py-3 tabular-nums text-right">
        <span className="text-[14px] font-semibold text-brand-black dark:text-white">
          {formatDecimal(Number(reserva.cantidad), 0)}
        </span>
      </td>

      {/* Documento */}
      <td className="px-4 py-3">
        {oc ? (
          <div>
            <span className={cn(
              "font-medium text-[12px]",
              reserva.origen === 'FACTURA_RESERVA'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-brand-blue dark:text-blue-400'
            )}>
              {reserva.origen === 'FACTURA_RESERVA' ? 'F.R.' : 'OC'} {oc.numero_oc}
            </span>
            <br />
            <span className="text-[11px] text-brand-steel-blue dark:text-white/40">
              {oc.proveedor_nombre.length > 28 ? oc.proveedor_nombre.slice(0, 28) + '…' : oc.proveedor_nombre}
            </span>
            {oc.fecha_entrega && (
              <>
                <br />
                <span className="text-[11px] text-brand-blue-gray dark:text-white/30">
                  Entrega: {formatFecha(oc.fecha_entrega)}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-brand-alice-blue dark:text-white/20">—</span>
        )}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <EstadoBadge estado={reserva.estado} />
          {reserva.estado === 'LIBERADA' && reserva.motivo_liberacion && (
            <span className="text-[10px] text-brand-blue-gray dark:text-white/30 max-w-[120px]" title={reserva.motivo_liberacion}>
              {reserva.motivo_liberacion.length > 30
                ? reserva.motivo_liberacion.slice(0, 30) + '…'
                : reserva.motivo_liberacion}
            </span>
          )}
        </div>
      </td>

      {/* Fecha */}
      <td className="px-4 py-3 text-[12px] text-brand-steel-blue dark:text-white/40 whitespace-nowrap">
        {formatFecha(reserva.creada_en)}
        {reserva.liberada_en && (
          <>
            <br />
            <span className="text-[10px] text-brand-blue-gray dark:text-white/30">
              Lib: {formatFecha(reserva.liberada_en)}
            </span>
          </>
        )}
      </td>

      {/* Acción */}
      <td className="px-4 py-3">
        {reserva.estado === 'ACTIVA' && (
          <button
            onClick={onLiberar}
            className={cn(
              'rounded-[8px] border border-semantic-error/30 px-3 py-1.5',
              'text-[12px] font-medium text-semantic-error',
              'transition-all duration-400 hover:bg-semantic-error hover:text-white hover:border-semantic-error'
            )}
          >
            Liberar
          </button>
        )}
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
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        </td>
      ))}
    </tr>
  )
}

// ------------------------------------------------------------------ //
// Cards de resumen
// ------------------------------------------------------------------ //

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border border-brand-alice-blue bg-white px-4 py-3 dark:border-white/10 dark:bg-brand-dark-blue">
      <span className="text-[12px] font-light text-brand-blue-gray dark:text-white/40">{label}</span>
      <span className={cn('text-[22px] font-semibold tabular-nums', color)}>{value}</span>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Página principal
// ------------------------------------------------------------------ //

const PAGE_SIZES = [10, 20, 50]

export default function Reservas() {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [origen, setOrigen] = useState('')
  const [estado, setEstado] = useState('ACTIVA')
  const [pagina, setPagina] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [liberando, setLiberando] = useState<Reserva | null>(null)

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtros = {
    ...(busquedaDebounced && { search: busquedaDebounced }),
    ...(origen && { origen }),
    ...(estado && { estado }),
    page: pagina,
    page_size: pageSize,
  }

  const { data, isLoading } = useReservas(filtros)

  // Stats separadas para ACTIVA (para los cards)
  const { data: statsActivas } = useReservas({ estado: 'ACTIVA', page_size: 1 })
  const { data: statsLiber } = useReservas({ estado: 'LIBERADA', page_size: 1 })
  const { data: statsBodega } = useReservas({ estado: 'ACTIVA', origen: 'BODEGA', page_size: 1 })
  const { data: statsTransito } = useReservas({ estado: 'ACTIVA', origen: 'TRANSITO', page_size: 1 })
  const { data: statsFR } = useReservas({ estado: 'ACTIVA', origen: 'FACTURA_RESERVA', page_size: 1 })

  const limpiar = useCallback(() => {
    setBusqueda('')
    setOrigen('')
    setEstado('ACTIVA')
    setPagina(1)
  }, [])

  const totalPaginas = data ? Math.ceil(data.count / pageSize) : 0

  const liberarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => liberarReserva(id, motivo),
    onSuccess: () => {
      setLiberando(null)
      void queryClient.invalidateQueries({ queryKey: ['reservas'] })
      void queryClient.invalidateQueries({ queryKey: ['lineas-pendientes'] })
      void queryClient.invalidateQueries({ queryKey: ['resumen-dashboard'] })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      {liberando && (
        <ConfirmarLiberar
          reserva={liberando}
          isPending={liberarMutation.isPending}
          onCancel={() => setLiberando(null)}
          onConfirm={(motivo) => liberarMutation.mutate({ id: liberando.id, motivo })}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">Reservas</h2>
        <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
          Reservas de stock activas e historial de liberaciones
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Reservas activas"
          value={(statsActivas?.count ?? '—').toLocaleString('es-CL')}
          color="text-brand-black dark:text-white"
        />
        <StatCard
          label="En bodega"
          value={(statsBodega?.count ?? '—').toLocaleString('es-CL')}
          color="text-semantic-success"
        />
        <StatCard
          label="En tránsito"
          value={(statsTransito?.count ?? '—').toLocaleString('es-CL')}
          color="text-brand-blue dark:text-blue-400"
        />
        <StatCard
          label="Fact. Reserva"
          value={(statsFR?.count ?? '—').toLocaleString('es-CL')}
          color="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          label="Liberadas (total)"
          value={(statsLiber?.count ?? '—').toLocaleString('es-CL')}
          color="text-brand-blue-gray dark:text-white/50"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="SKU, OV o cliente..."
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

        {/* Origen */}
        <Select
          value={origen}
          onChange={(v) => { setOrigen(v); setPagina(1) }}
          triggerIcon={<PackageOpen size={13} strokeWidth={1.5} />}
          options={[
            { value: '',                 label: 'Todos los orígenes' },
            { value: 'BODEGA',           label: 'Bodega',         icon: <Warehouse size={13} strokeWidth={1.5} /> },
            { value: 'TRANSITO',         label: 'Tránsito',       icon: <Ship      size={13} strokeWidth={1.5} /> },
            { value: 'FACTURA_RESERVA',  label: 'Fact. Reserva',  icon: <Ship      size={13} strokeWidth={1.5} /> },
          ]}
        />

        {/* Estado */}
        <Select
          value={estado}
          onChange={(v) => { setEstado(v); setPagina(1) }}
          triggerIcon={<Activity size={13} strokeWidth={1.5} />}
          options={[
            { value: '',         label: 'Todos los estados' },
            { value: 'ACTIVA',   label: 'Activas',   dot: '#0FCD0F' },
            { value: 'LIBERADA', label: 'Liberadas', dot: '#94a3b8' },
          ]}
        />

        {/* Limpiar */}
        {(busqueda || origen || estado !== 'ACTIVA') && (
          <button
            onClick={limpiar}
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

        {/* Contador + page size */}
        <div className="ml-auto flex items-center gap-3">
          {!isLoading && data && (
            <span className="text-[13px] font-light text-brand-blue-gray dark:text-white/40">
              {data.count.toLocaleString('es-CL')} reservas
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

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['SKU / Descripción', 'OV / Cliente', 'Bodega', 'Origen', 'Cantidad', 'Documento', 'Estado', 'Fechas', 'Acción'].map((h) => (
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

              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <PackageOpen size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin reservas</p>
                    <p className="mt-1 text-[13px] font-light">
                      {busqueda || origen || estado
                        ? 'Ninguna reserva coincide con los filtros aplicados'
                        : 'Ejecuta el Motor FIFO desde Inventario para generar reservas'}
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && data?.results.map((reserva) => (
                <ReservaRow
                  key={reserva.id}
                  reserva={reserva}
                  onLiberar={() => setLiberando(reserva)}
                />
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
                const hasta = Math.min(pagina * pageSize, data?.count ?? 0)
                return `${desde}–${hasta} de ${(data?.count ?? 0).toLocaleString('es-CL')}`
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
