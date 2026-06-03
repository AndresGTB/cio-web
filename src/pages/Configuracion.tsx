import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save } from 'lucide-react'
import { useState } from 'react'
import { getParametros, updateParametro } from '@/api/parametros'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { Parametro } from '@/types'

function ParametroRow({ parametro }: { parametro: Parametro }) {
  const [valor, setValor] = useState(parametro.valor)
  const [editando, setEditando] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (nuevoValor: string) => updateParametro(parametro.clave, nuevoValor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parametros'] })
      setEditando(false)
    },
  })

  const hayCambios = valor !== parametro.valor

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-brand-alice-blue bg-white p-4 dark:border-white/10 dark:bg-brand-dark-blue sm:flex-row sm:items-center sm:gap-4">
      <div className="flex-1">
        <p className="text-[13px] font-medium text-brand-black dark:text-white">{parametro.clave}</p>
        <p className="text-[12px] font-light text-brand-blue-gray dark:text-white/40">
          {parametro.descripcion}
        </p>
        <span className="mt-1 inline-block rounded-pill bg-brand-alice-blue px-2 py-0.5 text-[11px] font-medium text-brand-steel-blue dark:bg-white/10 dark:text-white/50">
          {parametro.tipo}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value)
            setEditando(true)
          }}
          className={cn(
            'w-40 rounded-[8px] border px-3 py-1.5 text-[13px] font-medium text-brand-black outline-none transition-all duration-400',
            'dark:bg-brand-black dark:text-white',
            editando && hayCambios
              ? 'border-[#73B8EF]'
              : 'border-brand-alice-blue dark:border-white/10'
          )}
        />
        {hayCambios && (
          <button
            onClick={() => mutation.mutate(valor)}
            disabled={mutation.isPending}
            aria-label="Guardar cambio"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand-black text-white transition-all duration-400 ease-out',
              'hover:bg-brand-blue-gray active:scale-[0.98]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2',
              'disabled:opacity-40'
            )}
          >
            {mutation.isPending
              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <Save size={14} strokeWidth={1.5} />
            }
          </button>
        )}
      </div>
    </div>
  )
}

export default function Configuracion() {
  const { data, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: getParametros,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
          Configuración
        </h2>
        <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
          Parámetros operacionales del sistema CIO 2.0
        </p>
      </div>

      {isLoading && <PageLoader />}

      {!isLoading && (!data?.results || data.results.length === 0) && (
        <EmptyState
          icon={Settings}
          titulo="Sin parámetros"
          descripcion="Ejecuta el seed inicial para crear los parámetros del sistema."
        />
      )}

      {!isLoading && data?.results && data.results.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.results.map((p) => (
            <ParametroRow key={p.clave} parametro={p} />
          ))}
        </div>
      )}
    </div>
  )
}
