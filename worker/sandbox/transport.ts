import type { HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { BodyBudgetExceeded, readBoundedJson } from '../http/bounded-body'
import { ProviderError, providerError } from './errors'
import { fileResponseBudget } from './file-response'
import type { BoatAccount } from './provider'
import { boatRoute, type BoatRoute } from './routes'

const BOAT_API = 'https://boat.dev/api/v1'
const RESPONSE_BUDGET = 1_048_576
const COMMAND_RESPONSE_BUDGET = 18_874_368

export class BoatTransport {
  private readonly key: string
  private readonly fetch: HttpFetch
  private readonly account?: BoatAccount

  constructor(key: string, fetch: HttpFetch, account?: BoatAccount) {
    this.key = key
    this.fetch = fetch
    this.account = account
  }

  async request(
    route: BoatRoute,
    body?: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<Record<string, unknown>> {
    const { method, path } = boatRoute(route)
    const headers = new Headers({
      Authorization: `Bearer ${this.key}`,
      Accept: 'application/json',
    })
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
    if (route.operation === 'delete')
      headers.set('X-Ascii-Confirm-Delete', route.sandboxId)
    if (this.account) {
      // An account key's active wallet can change outside the app.
      headers.set(
        'X-Boat-Org',
        this.account.type === 'personal' ? 'personal' : this.account.id,
      )
    }
    let response: Response
    try {
      response = await this.fetch(
        new Request(`${BOAT_API}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'error',
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
      } else if (response.ok && route.operation === 'command') {
        budget = COMMAND_RESPONSE_BUDGET
      }
      value = await readBoundedJson(response.body, budget)
    } catch (error) {
      if (error instanceof BodyBudgetExceeded) {
        if (response.ok && route.operation === 'readFile') throw error
        const command = route.operation === 'command'
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
