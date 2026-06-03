export const ROL_LABELS: Record<string, string> = {
  PLANIFICADOR: 'Planificador',
  COMPRAS: 'Compras',
  LOGISTICA: 'Logística',
  GERENCIA: 'Gerencia',
  TI: 'TI',
  SUPERVISOR: 'Supervisor',
}

export const ESTADO_OV_COLORS: Record<string, string> = {
  ABIERTA: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PARCIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  CUBIERTA: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CANCELADA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  FACTURADA: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
}

export const ESTADO_LINEA_COLORS: Record<string, string> = {
  ABIERTA: 'bg-blue-100 text-blue-800',
  CUBIERTA: 'bg-green-100 text-green-800',
  PARCIAL: 'bg-yellow-100 text-yellow-800',
  RIESGO: 'bg-red-100 text-red-800',
  SIN_PLANIFICACION: 'bg-gray-100 text-gray-600',
}

export const QUERY_STALE_TIME = 1000 * 60 * 5
