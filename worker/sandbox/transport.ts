import type { HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import {
  BodyBudgetExceeded,
  readBoundedBody,
  readBoundedJson,
} from '../http/bounded-body'
import { ProviderError, providerError } from './errors'
import { fileResponseBudget } from './file-response'
import { boatRoute, type BoatRoute } from './routes'

const BOAT_API = 'https://boat.dev/api/v1'
const RESPONSE_BUDGET = 1_048_576
const COMMAND_RESPONSE_BUDGET = 18_874_368

export class BoatTransport {
  private readonly key: string
  private readonly fetch: HttpFetch
  private readonly orgId: string

  constructor(key: string, fetch: HttpFetch, orgId: string) {
    this.key = key
    this.fetch = fetch
    this.orgId = orgId
  }

  async uploadFile(
    url: string,
    body: ReadableStream<Uint8Array>,
  ): Promise<void> {
    let response: Response
    try {
      const init = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body,
        redirect: 'manual' as const,
        credentials: 'omit' as const,
        signal: AbortSignal.timeout(65_000),
        duplex: 'half' as const,
      }
      response = await this.fetch(new Request(url, init))
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    try {
      if (response.body) await readBoundedBody(response.body, RESPONSE_BUDGET)
    } catch (error) {
      if (error instanceof BodyBudgetExceeded)
        throw new HttpError(
          502,
          'sandbox_response_too_large',
          'The cloud computer response is too large.',
        )
      if (!response.ok) throw providerError(response, null)
      throw new ProviderError('invalid_response', 502)
    }
    if (!response.ok) throw providerError(response, null)
  }

  async request(
    route: BoatRoute,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    const { method, path } = boatRoute(route)
    const command =
      route.operation === 'command' ||
      route.operation === 'startCommand' ||
      route.operation === 'commandStatus'
    const headers = new Headers({
      Authorization: `Bearer ${this.key}`,
      Accept: 'application/json',
      'X-Boat-Org': this.orgId,
    })
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
    if (route.operation === 'delete')
      headers.set('X-Ascii-Confirm-Delete', route.sandboxId)
    let response: Response
    try {
      response = await this.fetch(
        new Request(`${BOAT_API}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'manual',
          signal: AbortSignal.timeout(
            route.operation === 'command'
              ? 610_000
              : route.operation === 'readFile'
                ? 65_000
                : 30_000,
          ),
        }),
      )
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    let value: unknown
    try {
      let budget = RESPONSE_BUDGET
      if (response.ok && route.operation === 'readFile') {
        budget = fileResponseBudget(route.path, route.maxBytes)
      } else if (response.ok && command) {
        budget = COMMAND_RESPONSE_BUDGET
      }
      value = await readBoundedJson(response.body, budget)
    } catch (error) {
      if (error instanceof BodyBudgetExceeded) {
        if (response.ok && route.operation === 'readFile') throw error
        throw new HttpError(
          502,
          command ? 'command_output_too_large' : 'sandbox_response_too_large',
          command
            ? 'The command output is too large.'
            : 'The cloud computer response is too large.',
        )
      }
      if (!response.ok) throw providerError(response, null)
      throw new ProviderError('invalid_response', 502)
    }
    if (!response.ok) throw providerError(response, value)
    if (
      !isRecord(value) ||
      value.ok !== true ||
      typeof value.type !== 'string'
    ) {
      throw new ProviderError('invalid_response', 502)
    }
    return value
  }
}
