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
  cobrador: string
  nombre_deal: string
  operador: string
  completitud: string
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
  | 'CERRADA'

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
  fecha_probable: string | null
  tipo_facturacion: TipoFacturacion
  qty_bodega: string
  qty_factura_reserva: string
  qty_transito: string
  qty_pendiente_compra: string
  prioridad_penalizada: boolean
  fecha_penalizacion: string | null
  contador_liberaciones: number
  fecha_restauracion: string | null
  penalizada_por: { id: number; username: string } | null
  prioridad_restaurada_por: { id: number; username: string } | null
  // ATP — calculados por el Motor ATP
  estado_atp: EstadoATP | null
  fecha_sugerida_compra: string | null
  dias_para_vencer: number | null
  dias_para_comprar: number | null
  lead_time_usado: number | null
  margen_seguridad_usado: number | null
  atp_calculado_en: string | null
  modo_atp_usado: string | null
  ultimo_sync_sap: string | null
  creado_en: string
  actualizado_en: string
}

export interface LineaOVDetallada extends LineaOV {
  numero_ov: string
  cliente_id: string
  cliente_nombre: string
  fecha_compromiso_ov: string
  fecha_documento_ov: string | null
  operador_ov: string | null
  fecha_despacho: string | null
  despacho_a_tiempo: boolean | null
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
  total_ov: number
  total_lineas: number
  lineas_sin_planificacion: number
  lineas_parciales: number
  lineas_en_riesgo: number
  lineas_cubiertas: number
  lineas_cerradas: number
  ultimo_sync: string | null
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
  reservado_factura_reserva: string
  qty_en_oc: string
  qty_en_facturas_reserva: string
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
  tipo_documento?: 'OC' | 'FACTURA_RESERVA'
  sincronizado_en: string
  total_lineas?: number
  total_open_qty?: string
  lineas?: LineaOC[]
}

export type FacturaReserva = OrdenCompra

export type EstadoATP =
  | 'A_TIEMPO'
  | 'EN_RIESGO'
  | 'SIN_COBERTURA'
  | 'COMPRAR_YA'
  | 'COMPRAR_PRONTO'
  | 'NO_COMPRAR_AUN'
  | 'SIN_FECHA'

export type ModoATP = 'ESTANDAR' | 'OPTIMO' | 'DINAMICO'

export interface ConfiguracionATP {
  id: number
  empresa_db: string
  modo_activo: ModoATP
  peso_fecha_compromiso: number
  peso_cliente_vip: number
  peso_lead_time: number
  dias_urgente: number
  dias_comprar_pronto: number
  activa: boolean
  actualizado_en: string
}

export interface EjecucionATP {
  id: number
  empresa_db: string
  modo_usado: ModoATP
  lineas_procesadas: number
  lineas_a_tiempo: number
  lineas_en_riesgo: number
  lineas_comprar_ya: number
  lineas_comprar_pronto: number
  lineas_no_comprar_aun: number
  lineas_sin_cobertura: number
  lineas_sin_fecha: number
  errores: string[]
  iniciado_en: string
  finalizado_en: string | null
  duracion_segundos: string | null
}

export interface ResumenATP {
  a_tiempo: number
  en_riesgo: number
  comprar_ya: number
  comprar_pronto: number
  no_comprar_aun: number
  sin_cobertura: number
  sin_fecha: number
  valor_en_riesgo: number
  valor_comprar_pronto: number
  modo_activo: ModoATP
  ultimo_calculo: string | null
}

export type NivelCliente = 'VIP_PLUS' | 'VIP' | 'ESTANDAR'

export interface ClienteConfig {
  id: number
  empresa_db: string
  cliente_codigo: string
  cliente_nombre: string
  nivel_cliente: NivelCliente
  margen_seguridad_override: number | null
  notas: string
  creado_en: string
}

export interface Reserva {
  id: number
  empresa_db: string
  linea_ov: number
  numero_ov: string
  cliente_nombre: string
  fecha_documento_ov: string | null
  sku: string
  sku_descripcion: string
  bodega_codigo: string
  origen: 'BODEGA' | 'FACTURA_RESERVA' | 'TRANSITO'
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

export type UrgenciaCompra = 'URGENTE' | 'PROGRAMADA' | 'MONITOREO' | 'RIESGO_ETA'
export type EstadoSugerencia = 'PENDIENTE' | 'ACEPTADA' | 'IGNORADA' | 'VENCIDA' | 'RESUELTA'
export type MotivoExcepcion =
  | 'CLIENTE_CRITICO' | 'DESCUENTO_PROVEEDOR' | 'COMPRA_MINIMA'
  | 'CONSOLIDACION_IMPORTACION' | 'DECISION_GERENCIAL' | 'OTRO'
export type ClasificacionDMI = 'NECESARIA' | 'PROXIMA' | 'ANTICIPADA' | 'STOCK' | 'NO_ALINEADA'

export interface SugerenciaCompra {
  id: number
  empresa_db: string
  sku: string
  descripcion: string
  urgencia: UrgenciaCompra
  cantidad_sugerida: string
  fecha_sugerida_compra: string
  fecha_compromiso: string | null
  valor_estimado: string | null
  estado: EstadoSugerencia
  motivo_excepcion: MotivoExcepcion | null
  motivo_texto: string
  generada_en: string
  gestionada_en: string | null
  estado_atp_origen: string
  lead_time_usado: number | null
  linea_ov_id: number
  numero_ov: string
  cliente_nombre: string
  cliente_id: string
  dias_para_vencer: number | null
}

export interface ResumenCompras {
  urgentes_pendientes: number
  programadas_pendientes: number
  riesgo_eta_pendientes: number
  valor_urgente: number
  valor_programado: number
  valor_total_pendiente: number
  sugerencias_ignoradas_hoy: number
  sugerencias_vencidas: number
}

export interface AnalisisDMI {
  id: number
  sku: string
  clasificacion: ClasificacionDMI
  valor_compra: string | null
  valor_inmovilizado_estimado: string | null
  dias_cobertura: number | null
  fecha_oc: string | null
  fecha_entrega_oc: string | null
  lineas_ov_asociadas: number[]
  numero_oc: string
  proveedor_nombre: string
  proveedor_codigo: string
  descripcion: string
  cantidad_pendiente: string
}

export interface ResumenDMI {
  por_clasificacion: Record<string, { count: number; valor: number }>
  valor_total_anticipado: number
  valor_inmovilizado_estimado: number
  por_proveedor: Array<{
    proveedor_codigo: string
    proveedor_nombre: string
    total_oc: number
    valor_necesario: number
    valor_anticipado: number
    valor_no_alineado: number
    porcentaje_anticipado: number
  }>
  ultimo_analisis: string | null
}

// ---------------------------------------------------------------------------
// Facturación — Sprint 5
// ---------------------------------------------------------------------------

export type TipoDocumento =
  | 'ENTREGA'
  | 'BORRADOR_FACTURA'
  | 'FACTURA'
  | 'GUIA_FACTURABLE'
  | 'GUIA_NO_FACTURABLE'
  | 'ANTICIPO'

export type EstadoFacturable =
  | 'FACTURABLE_HOY'
  | 'FACTURABLE_FUTURO'
  | 'BLOQUEADO'
  | 'FACTURADO'
  | 'NO_APLICA'

export type MotivoBloqueo =
  | 'SIN_ENTREGA'
  | 'ENTREGA_PARCIAL'
  | 'HITO_NO_VENCIDO'
  | 'HITO_SIN_BORRADOR'
  | 'ANTICIPO_PENDIENTE'
  | 'SIN_COBERTURA'
  | 'OTRO'

export interface LineaEntregaItem {
  id: number
  numero_linea: number
  sku: string
  cantidad: string
  bodega_codigo: string
  ov_doc_entry: number | null
  ov_numero_linea: number | null
  linea_ov: number | null
}

export interface EntregaItem {
  id: number
  empresa_db: string
  doc_entry_sap: number
  numero_entrega: string
  cliente_codigo: string
  cliente_nombre: string
  fecha_entrega: string
  estado: 'ABIERTA' | 'CERRADA'
  sincronizado_en: string | null
  lineas: LineaEntregaItem[]
}

export interface BorradorFacturaItem {
  id: number
  empresa_db: string
  doc_entry_sap: number
  numero_borrador: string
  cliente_codigo: string
  cliente_nombre: string
  fecha_borrador: string
  fecha_vencimiento: string | null
  monto_total: string
  ov_doc_entry: number | null
  orden_venta: number | null
  numero_ov: string | null
  sincronizado_en: string | null
}

export interface ItemPipeline {
  id: number
  empresa_db: string
  orden_venta: number
  linea_ov: number | null
  borrador_factura: number | null
  entrega: number | null
  tipo_ov: 'ANTICIPO' | 'HITO' | 'ESTANDAR'
  tipo_documento: TipoDocumento
  cliente_codigo: string
  cliente_nombre: string
  sku: string
  descripcion: string
  monto_facturable: string
  moneda: string
  fecha_facturable: string | null
  fecha_compromiso: string | null
  estado_facturable: EstadoFacturable
  motivo_bloqueo: MotivoBloqueo | ''
  detalle_bloqueo: string
  calculado_en: string
  // Campos anidados (list serializer)
  numero_ov: string | null
  numero_ov_id: number | null
  borrador_monto: string | null
  borrador_fecha: string | null
  entrega_numero: string | null
  entrega_fecha: string | null
  // Campos extra (detail serializer)
  linea_ov_sku?: string | null
  linea_ov_descripcion?: string | null
  linea_ov_cantidad?: string | null
  linea_ov_qty_bodega?: string | null
  linea_ov_precio?: string | null
  entrega_estado?: string | null
  entrega_lineas?: LineaEntregaItem[]
}

export interface ProyeccionMensual {
  mes: string
  monto: number
  facturable_hoy: number
  facturable_futuro: number
  bloqueado: number
}

export interface ResumenFacturacion {
  facturable_hoy: { count: number; monto: number }
  facturable_30_dias: { count: number; monto: number }
  facturable_60_dias: { count: number; monto: number }
  facturable_90_dias: { count: number; monto: number }
  bloqueado: { count: number; monto: number }
  por_tipo_ov: Record<string, { count: number; monto: number }>
  bloqueos_por_motivo: Record<string, { count: number; monto: number }>
  ultimo_calculo: string | null
}

export interface EjecucionPipeline {
  id: number
  empresa_db: string
  items_procesados: number
  facturable_hoy: number
  facturable_futuro: number
  bloqueados: number
  ya_facturados: number
  monto_facturable_hoy: string
  monto_facturable_30_dias: string
  monto_facturable_60_dias: string
  monto_facturable_90_dias: string
  monto_bloqueado: string
  iniciado_en: string
  finalizado_en: string | null
  duracion_segundos: string | null
}
