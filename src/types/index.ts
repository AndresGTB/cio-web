export type Rol =
  | 'PLANIFICADOR'
  | 'COMPRAS'
  | 'LOGISTICA'
  | 'GERENCIA'
  | 'TI'
  | 'SUPERVISOR'

export interface Usuario {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  rol: Rol
  activo: boolean
}

export type EstadoOV = 'ABIERTA' | 'PARCIAL' | 'CUBIERTA' | 'CANCELADA' | 'FACTURADA'
export type OrigenOV = 'SAP' | 'HUBSPOT' | 'MANUAL'

export interface OrdenVenta {
  id: number
  numero_ov: string
  cliente_id: string
  cliente_nombre: string
  fecha_compromiso: string
  estado: EstadoOV
  origen: OrigenOV
  doc_entry_sap: number | null
  empresa_db: string
  sincronizado_en: string
  ultimo_sync_sap: string | null
  creado_en: string
  total_lineas?: number
  lineas?: LineaOV[]
}

export type EstadoLinea =
  | 'ABIERTA'
  | 'CUBIERTA'
  | 'PARCIAL'
  | 'RIESGO'
  | 'SIN_PLANIFICACION'

export type TipoFacturacion = 'ANTICIPO' | 'HITO' | 'ESTANDAR' | 'ERROR'

export interface LineaOV {
  id: number
  orden_venta: number
  numero_linea: number
  sku: string
  descripcion: string
  cantidad: number
  cantidad_pendiente: number
  cantidad_reservada: number
  unidad: string
  bodega: string
  estado: EstadoLinea
  precio_unitario: string | null
  moneda: string
  fecha_compromiso_linea: string | null
  open_qty_sap: string | null
  cantidad_original: string | null
  tipo_facturacion: TipoFacturacion
  qty_bodega: string
  qty_transito: string
  qty_pendiente_compra: string
  ultimo_sync_sap: string | null
  creado_en: string
  actualizado_en: string
}

export interface LineaOVDetallada extends LineaOV {
  numero_ov: string
  cliente_id: string
  cliente_nombre: string
  fecha_compromiso_ov: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginResponse extends AuthTokens {
  usuario: Usuario
}

export interface Parametro {
  id: number
  clave: string
  valor: string
  valor_casteado: string | number | boolean | object
  tipo: 'NUMERO' | 'TEXTO' | 'BOOLEAN' | 'JSON'
  descripcion: string
  editable_ui: boolean
  creado_en: string
  actualizado_en: string
}

export interface AuditLog {
  id: number
  usuario: number | null
  usuario_nombre: string
  entidad: string
  entidad_id: string
  accion: string
  detalle: Record<string, unknown>
  motivo: string | null
  ip_origen: string | null
  creado_en: string
}

export interface SyncLog {
  id: number
  tipo: string
  estado: 'INICIADO' | 'COMPLETADO' | 'ERROR'
  empresa_db: string
  ordenes_procesadas: number
  lineas_creadas: number
  lineas_actualizadas: number
  lineas_cerradas: number
  errores: string[]
  iniciado_en: string
  finalizado_en: string | null
  duracion_segundos: string | null
}

export interface SAPStatus {
  conectado: boolean
  empresa: string | null
  base_url?: string
  version_sap?: string
  mensaje?: string
}

export interface ResumenDashboard {
  total_lineas_abiertas: number
  total_ov_abiertas: number
  lineas_sin_planificacion: number
  lineas_parciales: number
  lineas_en_riesgo: number
  lineas_cubiertas: number
  ultimo_sync: string | null
  total_open_qty_valor: number
  bodegas: string[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface StockItem {
  id: number
  empresa_db: string
  bodega_codigo: string
  sku: string
  descripcion: string
  on_hand: string
  on_order: string
  reservado_bodega: string
  reservado_transito: string
  disponible_bodega: string
  disponible_transito: string
  qty_en_oc: string
  qty_demanda_pendiente: string
  ultimo_sync_sap: string | null
  actualizado_en: string
}

export interface LineaOC {
  id: number
  numero_linea: number
  sku: string
  descripcion: string
  cantidad: string
  cantidad_pendiente: string
  bodega_codigo: string
  precio_unitario: string | null
  fecha_entrega: string | null
}

export interface OrdenCompra {
  id: number
  empresa_db: string
  doc_entry_sap: number
  numero_oc: string
  proveedor_codigo: string
  proveedor_nombre: string
  fecha_oc: string
  fecha_entrega: string | null
  estado: 'ABIERTA' | 'CERRADA'
  sincronizado_en: string
  lineas?: LineaOC[]
}

export interface Reserva {
  id: number
  empresa_db: string
  linea_ov: number
  numero_ov: string
  cliente_nombre: string
  sku: string
  sku_descripcion: string
  bodega_codigo: string
  origen: 'BODEGA' | 'TRANSITO'
  cantidad: string
  linea_oc: number | null
  linea_oc_detalle: {
    id: number
    numero_oc: string
    proveedor_nombre: string
    fecha_entrega: string | null
    cantidad_pendiente: string
  } | null
  estado: 'ACTIVA' | 'LIBERADA'
  creada_por: number | null
  motivo_liberacion: string
  creada_en: string
  liberada_en: string | null
}
