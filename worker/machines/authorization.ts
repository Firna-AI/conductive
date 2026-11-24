import type { AppEnv } from '../env'
import type { HttpError } from '../http'
import { machineHttpError } from './errors'

export const MACHINE_TOKEN_PATTERN = 'cndm1\\.[0-9a-f]{64}\\.[A-Za-z0-9_-]{43}'

export function tokenRequired(): HttpError {
  return machineHttpError(
    401,
    'machine_token_required',
    'The connection is not available.',
  )
}

export function hostToken(request: Request): {
  token: string
  objectId: string
} {
  if (request.headers.has('Origin') || request.headers.has('Cookie'))
    throw machineHttpError(
      403,
      'machine_forbidden',
      'The connection is not available.',
    )
  if (
    request.method !== 'GET' ||
    request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
  )
    throw machineHttpError(
      426,
      'websocket_required',
      'Open a new connection to continue.',
    )
  const match = request.headers
    .get('Authorization')
    ?.match(new RegExp(`^Bearer (${MACHINE_TOKEN_PATTERN})$`, 'i'))
  const token = match?.[1]
  // The prefix and object ID are case sensitive even though the bearer scheme is not.
  if (!token || !new RegExp(`^${MACHINE_TOKEN_PATTERN}$`).test(token))
    throw tokenRequired()
  return { token, objectId: token.split('.')[1] }
}

export function machinesBinding(env: AppEnv): NonNullable<AppEnv['MACHINES']> {
  if (!env.MACHINES)
    throw machineHttpError(
      503,
      'service_unavailable',
      'The app is not available. Try again.',
    )
  return env.MACHINES
}

export function equalDigest(left: string, right: string): boolean {
  return crypto.subtle.timingSafeEqual(
    new TextEncoder().encode(left),
    new TextEncoder().encode(right),
  )
}
