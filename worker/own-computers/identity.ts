import type { AppEnv } from '../env'
import { HttpError } from '../http'

export interface ComputerOwner {
  orgId: string
  computerId: string
}

export function computerNamespace(env: AppEnv) {
  if (!env.OWN_COMPUTERS)
    throw new HttpError(
      503,
      'service_unavailable',
      'The app is not available. Try again.',
    )
  return env.OWN_COMPUTERS
}

export function computerObjectId(
  namespace: NonNullable<AppEnv['OWN_COMPUTERS']>,
  computerId: string,
) {
  return namespace.idFromName(`computer:${computerId}`)
}

export function sameComputer(left: ComputerOwner, right: ComputerOwner) {
  return left.orgId === right.orgId && left.computerId === right.computerId
}

export function computerNotFound() {
  return new HttpError(
    404,
    'own_computer_not_found',
    'The own computer is not available.',
  )
}
