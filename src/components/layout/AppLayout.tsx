import { useState, useEffect } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuth } from '@/hooks/useAuth'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Torre de Control',
  '/monitor': 'Monitor de Negocios',
  '/reservas': 'Reservas',
  '/compras': 'Compras',
  '/importaciones': 'Importaciones',
  '/facturacion': 'Facturación',
  '/configuracion': 'Configuración',
}

export function AppLayout() {
  const { usuario, logout, estaAutenticado } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('tema') === 'oscuro'
  })

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('tema', 'oscuro')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('tema', 'claro')
    }
  }, [darkMode])

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />
  }

  const titulo = ROUTE_TITLES[location.pathname] ?? 'CIO 2.0'

  return (
    <div className="flex h-screen overflow-hidden bg-brand-alice-blue dark:bg-[#161C23]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          usuario={usuario}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((v) => !v)}
          onLogout={logout}
          titulo={titulo}
        />

        <main className="flex-1 overflow-auto p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
