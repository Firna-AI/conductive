import { GatewayRequestError } from './errors'

export type GatewayCheckErrorKind = 'overloaded' | 'error' | 'unknown'

export class GatewayCheckError extends GatewayRequestError {
  readonly kind: GatewayCheckErrorKind

  constructor(error: unknown) {
    super('model_gateway_unavailable', 'The model turn could not be checked.')
    this.kind =
      typeof error === 'object' &&
      error !== null &&
      'overloaded' in error &&
      error.overloaded === true
        ? 'overloaded'
        : error instanceof Error
          ? 'error'
          : 'unknown'
  }
}
