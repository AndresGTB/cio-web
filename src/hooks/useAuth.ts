import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as apiLogin, getMe } from '@/api/auth'
import type { Usuario } from '@/types'

export function useAuth() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem('usuario')
    return stored ? (JSON.parse(stored) as Usuario) : null
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    setCargando(true)
    setError(null)
    try {
      const data = await apiLogin(username, password)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      setUsuario(data.usuario)
      navigate('/dashboard')
    } catch {
      setError('Credenciales incorrectas. Verifica tu usuario y contraseña.')
    } finally {
      setCargando(false)
    }
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.clear()
    setUsuario(null)
    navigate('/login')
  }, [navigate])

  const refrescarPerfil = useCallback(async () => {
    try {
      const me = await getMe()
      setUsuario(me)
      localStorage.setItem('usuario', JSON.stringify(me))
    } catch {
      // Si falla la sesión expiró — el interceptor redirige al login
    }
  }, [])

  const estaAutenticado = Boolean(localStorage.getItem('access_token') && usuario)

  return { usuario, cargando, error, login, logout, refrescarPerfil, estaAutenticado }
}
