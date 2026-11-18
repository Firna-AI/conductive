import type { HealthResponse } from '../src/shared/health'
import { privateResponse } from './http'

export function healthResponse(): Response {
  const body: HealthResponse = { status: 'ok' }
  return privateResponse(Response.json(body))
}
