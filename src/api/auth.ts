import apiClient from './client'
import type { LoginResponse, Usuario } from '@/types'

export async function login(username: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/auth/login/', {
    username,
    password,
  })
  return data
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const { data } = await apiClient.post<{ access: string }>('/api/auth/refresh/', { refresh })
  return data
}

export async function getMe(): Promise<Usuario> {
  const { data } = await apiClient.get<Usuario>('/api/auth/me/')
  return data
}
