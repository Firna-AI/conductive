import type { HttpFetch } from '../../env'
import { HttpError } from '../../http'
import {
  BodyBudgetExceeded,
  readBoundedBody,
  readBoundedJson,
} from '../../http/bounded-body'
import { ProviderError } from '../errors'
import { controlError, mutationError } from './errors'
import { controlRoute, type E2bRoute } from './routes'

const RESPONSE_BUDGET = 1_048_576

export class E2bControl {
  private readonly key: string
  private readonly domain: string
  private readonly fetch: HttpFetch

  constructor(key: string, domain: string, fetch: HttpFetch) {
    this.key = key
    this.domain = domain
    this.fetch = fetch
  }

  async request(
    route: E2bRoute,
    options: {
      body?: Record<string, unknown>
      query?: URLSearchParams
      signal?: AbortSignal
    } = {},
  ) {
    const { method, path } = controlRoute(route)
    const url = new URL(path, `https://api.${this.domain}`)
    if (options.query) url.search = options.query.toString()
    let response: Response
    try {
      const headers = new Headers({
        'X-API-Key': this.key,
        Accept: 'application/json',
      })
      if (options.body !== undefined)
        headers.set('Content-Type', 'application/json')
      response = await this.fetch(
        new Request(url, {
          method,
          headers,
          body:
            options.body === undefined
              ? undefined
              : JSON.stringify(options.body),
          redirect: 'manual',
          signal: options.signal ?? AbortSignal.timeout(30_000),
        }),
      )
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    let value: unknown
    const failure =
      route.operation === 'create' || route.operation === 'saveSnapshot'
        ? mutationError
        : controlError
    try {
      if (response.status === 204) {
        if (response.body) await readBoundedBody(response.body, RESPONSE_BUDGET)
        value = null
      } else value = await readBoundedJson(response.body, RESPONSE_BUDGET)
    } catch (error) {
      if (error instanceof BodyBudgetExceeded)
        throw new HttpError(
          502,
          'sandbox_response_too_large',
          'The cloud computer response is too large.',
        )
      if (!response.ok) throw failure(response, null)
      throw new ProviderError('invalid_response', 502)
    }
    if (!response.ok) throw failure(response, value)
    return { value, headers: response.headers, status: response.status }
  }
}
