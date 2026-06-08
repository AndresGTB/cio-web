import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { QUERY_STALE_TIME } from '@/lib/constants'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const MonitorNegocios = lazy(() => import('@/pages/MonitorNegocios'))
const Reservas = lazy(() => import('@/pages/Reservas'))
const Compras = lazy(() => import('@/pages/Compras'))
const Configuracion = lazy(() => import('@/pages/Configuracion'))
const InventarioStock = lazy(() => import('@/pages/InventarioStock'))
const FacturasReserva = lazy(() => import('@/pages/FacturasReserva'))
const MotorATP = lazy(() => import('@/pages/MotorATP'))
const ClientesVIP = lazy(() => import('@/pages/ClientesVIP'))
const Facturacion = lazy(() => import('@/pages/Facturacion'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      retry: 1,
    },
  },
})

function PlaceholderPage({ nombre }: { nombre: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-[16px] border border-brand-alice-blue bg-white dark:border-white/10 dark:bg-brand-dark-blue">
      <p className="text-[16px] font-light text-brand-blue-gray dark:text-white/40">
        {nombre} — disponible en próximos sprints
      </p>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="monitor" element={<MonitorNegocios />} />
                <Route path="reservas" element={<Reservas />} />
                <Route path="compras" element={<Compras />} />
                <Route path="inventario" element={<InventarioStock />} />
                <Route path="facturas-reserva" element={<FacturasReserva />} />
                <Route path="atp" element={<MotorATP />} />
                <Route path="clientes" element={<ClientesVIP />} />
                <Route path="importaciones" element={<PlaceholderPage nombre="Importaciones" />} />
                <Route path="facturacion" element={<Facturacion />} />
                <Route path="configuracion" element={<Configuracion />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
