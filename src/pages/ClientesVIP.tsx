import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Download, Search, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getClientes, patchCliente, importarClientesSAP } from '@/api/atp'
import type { FiltrosClientes } from '@/api/atp'
import { useDebounce } from '@/hooks/useDebounce'
import type { ClienteConfig, NivelCliente } from '@/types'

// ─── helpers de nivel ─────────────────────────────────────────────────────────

const NIVEL_META: Record<NivelCliente, { label: string; className: string }> = {
  VIP_PLUS: {
    label: 'VIP+',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  VIP: {
    label: 'VIP',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  ESTANDAR: {
    label: 'Estándar',
    className: 'bg-brand-alice-blue text-brand-steel-blue dark:bg-white/10 dark:text-white/50',
  },
}

const NIVELES: NivelCliente[] = ['VIP_PLUS', 'VIP', 'ESTANDAR']

// ─── selector de nivel inline ─────────────────────────────────────────────────

function NivelSelector({ clienteId, nivelActual }: { clienteId: number; nivelActual: NivelCliente }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (nivel: NivelCliente) => patchCliente(clienteId, { nivel_cliente: nivel }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })

  return (
    <div className="flex gap-1">
      {NIVELES.map((nivel) => {
        const meta = NIVEL_META[nivel]
        const activo = nivel === nivelActual
        return (
          <button
            key={nivel}
            onClick={() => !activo && mutation.mutate(nivel)}
            disabled={mutation.isPending}
            className={cn(
              'inline-flex items-center rounded-pill px-2.5 py-0.5 text-[12px] font-medium transition-all duration-400',
              meta.className,
              activo ? 'opacity-100' : 'opacity-30 hover:opacity-70'
            )}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-brand-alice-blue dark:bg-white/10" />
        </td>
      ))}
    </tr>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function ClientesVIP() {
  const [busqueda, setBusqueda] = useState('')
  const [filtroNivel, setFiltroNivel] = useState<NivelCliente | ''>('')
  const [pagina, setPagina] = useState(1)

  const busquedaDebounced = useDebounce(busqueda, 300)

  const filtros: FiltrosClientes = {
    ...(busquedaDebounced && { search: busquedaDebounced }),
    ...(filtroNivel && { nivel_cliente: filtroNivel }),
    page: pagina,
    page_size: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', filtros],
    queryFn: () => getClientes(filtros),
  })

  // Conteos totales — query sin filtros de búsqueda/nivel para las tarjetas
  const { data: totales } = useQuery({
    queryKey: ['clientes-totales'],
    queryFn: () => getClientes({ page_size: 1 }),
    staleTime: 60_000,
  })

  const qc = useQueryClient()
  const importarMutation = useMutation({
    mutationFn: importarClientesSAP,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      alert(`${res.mensaje}`)
    },
    onError: (err: Error) => alert(`Error: ${err.message}`),
  })

  const total = data?.count ?? 0
  const totalPaginas = Math.ceil(total / PAGE_SIZE)
  const totalGlobal = totales?.count ?? 0

  const cambiarNivel = (nivel: NivelCliente | '') => {
    setFiltroNivel(nivel)
    setPagina(1)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users size={24} strokeWidth={1.5} className="text-purple-500" />
            <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
              Clientes
            </h2>
          </div>
          <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
            {totalGlobal} clientes configurados · niveles de prioridad FIFO y ATP
          </p>
        </div>

        <button
          onClick={() => importarMutation.mutate()}
          disabled={importarMutation.isPending}
          className={cn(
            'inline-flex items-center gap-2 rounded-pill px-5 py-2.5',
            'bg-brand-black text-[13px] font-medium text-white',
            'transition-all duration-400 ease-out hover:bg-brand-dark-blue',
            'dark:bg-white/10 dark:hover:bg-white/20',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Download size={15} strokeWidth={1.5} />
          {importarMutation.isPending ? 'Importando…' : 'Importar desde SAP'}
        </button>
      </div>

      {/* Tarjetas de resumen — filtran la tabla al hacer clic */}
      <div className="grid grid-cols-3 gap-4">
        {NIVELES.map((nivel) => {
          const meta = NIVEL_META[nivel]
          const activo = filtroNivel === nivel
          return (
            <button
              key={nivel}
              onClick={() => cambiarNivel(activo ? '' : nivel)}
              className={cn(
                'flex items-center gap-4 rounded-[16px] border p-4 text-left transition-all duration-400',
                'bg-white dark:bg-brand-dark-blue',
                activo
                  ? 'border-brand-blue/40 ring-1 ring-brand-blue/20'
                  : 'border-brand-alice-blue dark:border-white/10 hover:border-brand-blue/30'
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
                nivel === 'VIP_PLUS' ? 'bg-purple-100 dark:bg-purple-900/30' :
                nivel === 'VIP'      ? 'bg-amber-100 dark:bg-amber-900/30' :
                                      'bg-brand-alice-blue dark:bg-white/5'
              )}>
                {nivel !== 'ESTANDAR' ? (
                  <Star
                    size={20}
                    strokeWidth={1}
                    className={nivel === 'VIP_PLUS' ? 'text-purple-600 dark:text-purple-300' : 'text-amber-600 dark:text-amber-300'}
                    fill={nivel === 'VIP_PLUS' ? 'currentColor' : 'none'}
                  />
                ) : (
                  <Users size={20} strokeWidth={1} className="text-brand-steel-blue dark:text-white/40" />
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-blue-gray dark:text-white/50">
                  {meta.label}
                </p>
                <p className="text-[24px] font-semibold leading-tight text-brand-black dark:text-white">
                  —
                </p>
              </div>
            </button>
          )
        })}
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
            placeholder="Buscar por nombre o código…"
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

        {!isLoading && data && (
          <span className="ml-auto text-[13px] font-light text-brand-blue-gray dark:text-white/40">
            {total.toLocaleString('es-CL')} clientes
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-brand-alice-blue dark:border-white/10">
                {['Código', 'Nombre', 'Nivel', 'Notas'].map((h) => (
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
                  <td colSpan={4} className="py-16 text-center text-brand-blue-gray dark:text-white/40">
                    <Users size={40} strokeWidth={1} className="mx-auto mb-3 opacity-40" />
                    <p className="text-[16px] font-medium">
                      {totalGlobal === 0 ? 'Sin clientes' : 'Sin coincidencias'}
                    </p>
                    <p className="mt-1 text-[13px] font-light">
                      {totalGlobal === 0
                        ? 'Importa desde SAP para comenzar'
                        : 'Ningún cliente coincide con la búsqueda actual'}
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && data?.results.map((cliente: ClienteConfig) => (
                <tr
                  key={cliente.id}
                  className="border-b border-brand-alice-blue/50 transition-colors duration-200 hover:bg-brand-alice-blue/30 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px] text-brand-steel-blue dark:text-white/40">
                      {cliente.cliente_codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-brand-black dark:text-white">
                      {cliente.cliente_nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <NivelSelector clienteId={cliente.id} nivelActual={cliente.nivel_cliente} />
                  </td>
                  <td className="px-4 py-3 text-brand-blue-gray dark:text-white/40">
                    {cliente.notas || '—'}
                  </td>
                </tr>
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
                  'text-brand-blue-gray transition-all duration-400 dark:border-white/10 dark:text-white/40',
                  'hover:border-brand-black hover:text-brand-black dark:hover:border-white/30 dark:hover:text-white',
                  'disabled:cursor-not-allowed disabled:opacity-40'
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
