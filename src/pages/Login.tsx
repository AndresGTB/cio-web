import { useState, type FormEvent, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export default function Login() {
  const { login, cargando, error, estaAutenticado } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [userFocused, setUserFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  if (estaAutenticado) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    await login(username.trim(), password)
  }

  const userHasValue = username.length > 0
  const passHasValue = password.length > 0

  return (
    <div className="flex min-h-screen bg-brand-black">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden w-1/2 flex-col justify-between p-16 lg:flex">
        <div>
          <span className="text-[28px] font-semibold tracking-tight text-white">
            CIO <span className="text-brand-aquamarine">2.0</span>
          </span>
          <div
            className="mt-2 h-[2px] w-12"
            style={{ background: 'linear-gradient(to right, #0002FB, #F1A828)' }}
          />
        </div>

        <div>
          <h1 className="text-[48px] font-semibold uppercase leading-tight text-white">
            Torre de<br />Control<br />Operacional
          </h1>
          <p className="mt-6 max-w-sm text-[16px] font-light text-white/60">
            Gestión inteligente de reservas, compras y despacho. Integrado con SAP, HubSpot y WMS.
          </p>
        </div>

        <div className="flex gap-6">
          {['SAP B1', 'HubSpot', 'WMS Oracle'].map((sys) => (
            <div key={sys} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-aquamarine" />
              <span className="text-[13px] font-light text-white/40">{sys}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gradiente divisor vertical */}
      <div
        className="hidden w-px lg:block"
        style={{ background: 'linear-gradient(to bottom, #0002FB, #20E0B2, #C80008, #F1A828)' }}
      />

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 items-center justify-center bg-white p-8 lg:bg-transparent">
        <div className="w-full max-w-[400px]">
          {/* Header mobile */}
          <div className="mb-8 lg:hidden">
            <span className="text-[24px] font-semibold text-brand-black">
              CIO <span className="text-brand-blue">2.0</span>
            </span>
          </div>

          <div className="lg:rounded-[24px] lg:bg-white lg:p-10 lg:shadow-xl">
            <h2 className="text-[28px] font-semibold text-brand-black">Iniciar sesión</h2>
            <p className="mt-1 text-[14px] font-light text-brand-blue-gray">
              Ingresa con tu cuenta de CIO 2.0
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
              {/* Campo usuario */}
              <div className="relative">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] border px-4 py-3 transition-all duration-400 ease-out',
                    userFocused
                      ? 'border-[#73B8EF]'
                      : 'border-brand-alice-blue hover:border-brand-blue-gray/40'
                  )}
                >
                  <User
                    size={18}
                    strokeWidth={1.5}
                    className={cn(
                      'shrink-0 transition-colors duration-400',
                      userFocused ? 'text-brand-blue' : 'text-brand-steel-blue'
                    )}
                  />
                  <div className="relative flex-1">
                    <label
                      htmlFor="username"
                      className={cn(
                        'pointer-events-none absolute left-0 text-brand-blue-gray transition-all duration-400 ease-out',
                        userFocused || userHasValue
                          ? '-top-4 text-[11px] text-brand-blue'
                          : 'top-0 text-[14px]'
                      )}
                    >
                      Usuario o correo
                    </label>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setUserFocused(true)}
                      onBlur={() => setUserFocused(false)}
                      className="mt-3 w-full bg-transparent text-[14px] text-brand-black outline-none placeholder:text-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Campo contraseña */}
              <div className="relative">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-[10px] border px-4 py-3 transition-all duration-400 ease-out',
                    passFocused
                      ? 'border-[#73B8EF]'
                      : 'border-brand-alice-blue hover:border-brand-blue-gray/40'
                  )}
                >
                  <Lock
                    size={18}
                    strokeWidth={1.5}
                    className={cn(
                      'shrink-0 transition-colors duration-400',
                      passFocused ? 'text-brand-blue' : 'text-brand-steel-blue'
                    )}
                  />
                  <div className="relative flex-1">
                    <label
                      htmlFor="password"
                      className={cn(
                        'pointer-events-none absolute left-0 text-brand-blue-gray transition-all duration-400 ease-out',
                        passFocused || passHasValue
                          ? '-top-4 text-[11px] text-brand-blue'
                          : 'top-0 text-[14px]'
                      )}
                    >
                      Contraseña
                    </label>
                    <input
                      id="password"
                      type={mostrarPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      className="mt-3 w-full bg-transparent text-[14px] text-brand-black outline-none placeholder:text-transparent"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((v) => !v)}
                    aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="shrink-0 text-brand-steel-blue transition-colors duration-400 hover:text-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1"
                  >
                    {mostrarPassword
                      ? <EyeOff size={16} strokeWidth={1.5} />
                      : <Eye size={16} strokeWidth={1.5} />
                    }
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="animate-fade-in rounded-[8px] bg-semantic-error/10 px-3 py-2 text-[13px] font-light text-semantic-error">
                  {error}
                </p>
              )}

              {/* Botón */}
              <button
                type="submit"
                disabled={cargando || !username.trim() || !password.trim()}
                className={cn(
                  'mt-2 flex h-12 w-full items-center justify-center rounded-[10px] text-[16px] font-semibold text-white',
                  'bg-brand-black transition-all duration-400 ease-out',
                  'hover:bg-brand-blue-gray active:scale-[0.98]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-40'
                )}
              >
                {cargando ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Ingresando...
                  </span>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[12px] font-light text-brand-steel-blue lg:text-white/30">
            PRECISION Technology · CIO 2.0
          </p>
        </div>
      </div>
    </div>
  )
}
