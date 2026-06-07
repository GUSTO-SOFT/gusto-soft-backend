export enum CuentaEstado {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export enum DescuentoTipo {
  PORCENTAJE = 'PORCENTAJE',
  VALOR_FIJO = 'VALOR_FIJO',
}

export enum FacturaEstado {
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
  PENDIENTE_REINTENTO = 'PENDIENTE_REINTENTO',
}

export enum FacturaEnvioEstado {
  ENVIADO = 'ENVIADO',
  ERROR = 'ERROR',
}
