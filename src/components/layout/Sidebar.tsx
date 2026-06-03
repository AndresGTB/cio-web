import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  Ship,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  Box,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Torre de Control', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Monitor de Negocios', to: '/monitor', icon: BarChart3 },
  { label: 'Reservas', to: '/reservas', icon: Package },
  { label: 'Inventario', to: '/inventario', icon: Box },
  { label: 'Compras', to: '/compras', icon: ShoppingCart },
  { label: 'Importaciones', to: '/importaciones', icon: Ship },
  { label: 'Facturación', to: '/facturacion', icon: Receipt },
  { label: 'Configuración', to: '/configuracion', icon: Settings },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={cn(
        'relative flex h-full flex-col bg-brand-black transition-all duration-400 ease-out',
        collapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        {!collapsed && (
          <span className="animate-fade-in text-[18px] font-semibold tracking-tight text-white">
            CIO <span className="text-brand-aquamarine">2.0</span>
          </span>
        )}
        {collapsed && (
          <span className="text-[18px] font-semibold text-brand-aquamarine">C</span>
        )}
      </div>

      {/* Gradiente divisor */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(to right, #0002FB, #20E0B2, #C80008, #F1A828)' }}
      />

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all duration-400 ease-out',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{ background: 'linear-gradient(to bottom, #0002FB, #F1A828)' }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="shrink-0 transition-transform duration-400 group-hover:scale-105"
                />
                {!collapsed && (
                  <span className="animate-slide-in truncate">{label}</span>
                )}
                {/* Tooltip cuando está colapsado */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-[8px] bg-brand-dark-blue px-2.5 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-400 group-hover:opacity-100">
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Versión */}
      {!collapsed && (
        <div className="border-t border-white/10 p-4">
          <p className="text-[12px] font-light text-white/30">Versión 2.0.0</p>
          <p className="text-[12px] font-light text-white/20">PRECISION Tech</p>
        </div>
      )}

      {/* Botón colapsar */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-brand-black text-white/60 transition-all duration-400 ease-out hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}
