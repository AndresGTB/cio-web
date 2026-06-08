import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Container,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFecha, formatDecimal } from '@/lib/utils'
import {
  getFacturasReserva,
  getFacturaReservaDetalle,
  type FiltrosFacturasReserva,
} from '@/api/inventario'
import { useDebounce } from '@/hooks/useDebounce'
import type { FacturaReserva, LineaOC } from '@/types'

// ------------------------------------------------------------------ //
// Badge de estado
// ------------------------------------------------------------------ //

function EstadoBadge({ estado }: { estado: 'ABIERTA' | 'CERRADA' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium',
        estado === 'ABIERTA'
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
          : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/30'
      )}
    >
      {estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}
    </span>
  )
}

// ------------------------------------------------------------------ //
// Fila expandible con líneas de factura
// ------------------------------------------------------------------ //

function FilaFactura({ factura }: { factura: FacturaReserva }) {
  const [expandida, setExpandida] = useState(false)
  const [cargandoLineas, setCargandoLineas] = useState(false)
  const [lineas, setLineas] = useState<LineaOC[] | null>(null)

  const toggleExpandir = async () => {
    if (!expandida && !lineas) {
      setCargandoLineas(true)
      try {
        const detalle = await getFacturaReservaDetalle(factura.id)
        setLineas(detalle.lineas ?? [])
      } catch {
        setLineas([])
      } finally {
        setCargandoLineas(false)
      }
    }
    setExpandida((prev) => !prev)
  }

  return (
    <>
      <tr
        className="cursor-pointer border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5"
        onClick={toggleExpandir}
      >
        <td className="px-4 py-3">
          <span className="flex items-center gap-1 text-[12px] text-brand-steel-blue dark:text-white/40">
            {expandida
              ? <ChevronDown size={14} strokeWidth={1.5} />
              : <ChevronRight size={14} strokeWidth={1.5} />
            }
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="font-medium text-brand-black dark:text-white">
            {factura.numero_oc}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-brand-black dark:text-white">{factura.proveedor_nombre || factura.proveedor_codigo}</span>
          <br />
          <span className="text-[11px] text-brand-steel-blue dark:text-white/40">{factura.proveedor_codigo}</span>
        </td>
        <td className="px-4 py-3 text-[13px] text-brand-black dark:text-white">
          {formatFecha(factura.fecha_oc)}
        </td>
        <td className="px-4 py-3 text-[13px] text-brand-black dark:text-white">
          {factura.fecha_entrega ? formatFecha(factura.fecha_entrega) : '—'}
        </td>
        <td className="px-4 py-3">
          <EstadoBadge estado={factura.estado} />
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-[13px] text-brand-black dark:text-white">
          {factura.total_lineas ?? '—'}
        </td>
        <td className="px-4 py-3 text-right tabular-nums text-[13px] text-purple-600 dark:text-purple-400">
          {factura.total_open_qty
            ? formatDecimal(Number(factura.total_open_qty), 0)
            : '—'}
        </td>
      </tr>

      {/* Líneas expandidas */}
      {expandida && (
        <tr className="bg-brand-alice-blue/20 dark:bg-white/3">
          <td colSpan={8} className="px-6 py-3">
            {cargandoLineas && (
              <div className="flex items-center gap-2 text-[13px] text-brand-blue-gray dark:text-white/40">
                <RefreshCw size={14} className="animate-spin" />
                Cargando líneas...
              </div>
            )}
            {!cargandoLineas && lineas && lineas.length === 0 && (
              <p className="text-[13px] text-brand-blue-gray dark:text-white/40">
                Sin líneas con cantidad pendiente en BOD1011
              </p>
            )}
            {!cargandoLineas && lineas && lineas.length > 0 && (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-brand-blue-gray dark:text-white/40">
                    <th className="pb-1.5 pr-4 text-left font-medium">SKU</th>
                    <th className="pb-1.5 pr-4 text-left font-medium">Descripción</th>
                    <th className="pb-1.5 pr-4 text-right font-medium">Cantidad</th>
                    <th className="pb-1.5 pr-4 text-right font-medium">Pendiente (OpenCreQty)</th>
                    <th className="pb-1.5 pr-4 text-left font-medium">Bodega</th>
                    <th className="pb-1.5 text-left font-medium">ETA línea</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.map((linea) => (
                    <tr key={linea.id} className="border-t border-brand-alice-blue/50 dark:border-white/5">
                      <td className="py-1.5 pr-4 font-medium text-brand-black dark:text-white">
                        {linea.sku}
                      </td>
                      <td className="py-1.5 pr-4 text-brand-blue-gray dark:text-white/50 max-w-[200px] truncate" title={linea.descripcion}>
                        {linea.descripcion}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-brand-black dark:text-white">
                        {formatDecimal(Number(linea.cantidad), 0)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                        {formatDecimal(Number(linea.cantidad_pendiente), 0)}
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className="rounded-[6px] bg-brand-alice-blue px-1.5 py-0.5 text-brand-steel-blue dark:bg-white/10 dark:text-white/60">
                          {linea.bodega_codigo}
                        </span>
                      </td>
                      <td className="py-1.5 text-brand-blue-gray dark:text-white/40">
                        {linea.fecha_entrega ? formatFecha(linea.fecha_entrega) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ------------------------------------------------------------------ //
// Skeleton
// ------------------------------------------------------------------ //

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
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

export default function FacturasReserva() {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<'ABIERTA' | 'CERRADA' | ''>('ABIERTA')
  const [pagina, setPagina] = useState(1)

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtros: FiltrosFacturasReserva = {
    ...(estado && { estado }),
    ...(busquedaDebounced && { search: busquedaDebounced }),
    page: pagina,
    page_size: 20,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['facturas-reserva', filtros],
    queryFn: () => getFacturasReserva(filtros),
  })

  const totalPaginas = data ? Math.ceil(data.count / 20) : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Container size={24} strokeWidth={1.5} className="text-purple-500" />
            <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
              Facturas de Reserva
            </h2>
          </div>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            Importaciones en tránsito (OPCH SAP) — stock disponible antes que las OC nacionales
          </p>
        </div>

      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-steel-blue" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Buscar por N° factura o proveedor..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1) }}
            className={cn(
              'h-10 w-full rounded-[10px] border border-brand-alice-blue pl-9 pr-4',
              'text-[14px] font-light text-brand-black outline-none',
              'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
              'transition-all duration-400 focus:border-purple-400',
              'placeholder:text-brand-steel-blue/60'
            )}
          />
        </div>

        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value as typeof estado); setPagina(1) }}
          className={cn(
            'h-10 rounded-[10px] border border-brand-alice-blue px-3',
            'text-[13px] font-medium text-brand-black outline-none',
            'bg-white dark:border-white/10 dark:bg-brand-dark-blue dark:text-white',
            'transition-all duration-400 focus:border-purple-400'
          )}
        >
          <option value="ABIERTA">Abiertas</option>
          <option value="CERRADA">Cerradas</option>
          <option value="">Todas</option>
        </select>

        {!isLoading && data && (
          <span className="ml-auto text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {data.count.toLocaleString('es-CL')} facturas
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['', 'N° Factura', 'Proveedor', 'Fecha', 'ETA', 'Estado', 'Líneas', 'OpenCreQty'].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      'bg-brand-alice-blue/50 px-4 py-3 font-medium text-brand-blue-gray dark:bg-white/5 dark:text-white/50',
                      h === 'OpenCreQty' || h === 'Líneas' ? 'text-right' : ''
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && data?.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Package size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">Sin facturas de reserva</p>
                    <p className="mt-1 text-[13px] font-light">
                      Sincroniza con SAP para importar las PurchaseInvoices abiertas
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && data?.results.map((factura) => (
                <FilaFactura key={factura.id} factura={factura} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!isLoading && totalPaginas > 1 && (
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
                  'text-brand-blue-gray transition-all duration-400',
                  'hover:border-brand-black hover:text-brand-black dark:border-white/10 dark:text-white/40',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                ‹
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-[8px] border border-brand-alice-blue',
                  'text-brand-blue-gray transition-all duration-400',
                  'hover:border-brand-black hover:text-brand-black dark:border-white/10 dark:text-white/40',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
