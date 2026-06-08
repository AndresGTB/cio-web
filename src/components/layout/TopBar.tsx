import { Sun, Moon, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROL_LABELS } from '@/lib/constants'
import type { Usuario } from '@/types'

interface Props {
  usuario: Usuario | null
  darkMode: boolean
  onToggleDark: () => void
  onLogout: () => void
  titulo?: string
}

export function TopBar({ usuario, darkMode, onToggleDark, onLogout, titulo }: Props) {
  const nombreCompleto = usuario
    ? `${usuario.first_name} ${usuario.last_name}`.trim() || usuario.username
    : ''

  return (
    <header className="flex h-16 items-center justify-between border-b border-brand-alice-blue bg-white px-6 dark:border-white/10 dark:bg-brand-dark-blue">
      {/* Título de sección */}
      <h1 className="text-[20px] font-semibold text-brand-black dark:text-white">
        {titulo ?? 'CIO 2.0'}
      </h1>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        {/* Toggle tema */}
        <button
          onClick={onToggleDark}
          aria-label="Cambiar tema"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-[8px] text-brand-blue-gray transition-all duration-400 ease-out',
            'hover:bg-brand-alice-blue dark:hover:bg-white/10 dark:text-white/60 dark:hover:text-white',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2'
          )}
        >
          {darkMode ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>

        {/* Separador */}
        <div className="h-6 w-px bg-brand-alice-blue dark:bg-white/10" />

        {/* Info usuario */}
        {usuario && (
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-black text-white dark:bg-white dark:text-brand-black"
              aria-hidden
            >
              <User size={16} strokeWidth={1.5} />
            </div>
            <div className="hidden sm:block">
              <p className="text-[14px] font-medium leading-tight text-brand-black dark:text-white">
                {nombreCompleto}
              </p>
              <p className="text-[12px] font-light leading-tight text-brand-blue-gray dark:text-white/50">
                {ROL_LABELS[usuario.rol] ?? usuario.rol}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-[8px] text-brand-blue-gray transition-all duration-400 ease-out',
            'dark:text-white/60',
            'hover:bg-semantic-error/10 hover:text-semantic-error',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-offset-2'
          )}
        >
          <LogOut size={18} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
