import { isRecord } from '../../http'
import { BodyBudgetExceeded, readBoundedJson } from '../../http/bounded-body'
import { ProviderError } from '../errors'
import type { HttpFetch } from '../../env'
import { CONTROL_BUDGET, ResponseBudget, responseOverflow } from './budgets'
import type { E2bContext } from './context'
import { invalidResponse } from './errors'
import { envdError } from './envd-errors'
import { envdRoute, type EnvdRoute, type EnvdUser } from './envd-routes'
import { sandboxSegment, secretToken } from './identity'
import { readSandbox } from './parsers'

export class EnvdSession {
  private readonly origin: string
  private readonly token: string
  private readonly fetch: HttpFetch

  constructor(origin: string, token: string, fetch: HttpFetch) {
    this.origin = origin
    this.token = token
    this.fetch = fetch
  }

  async send(
    route: EnvdRoute,
    budget: ResponseBudget,
    options: {
      user?: EnvdUser
      body?: BodyInit
      headers?: Record<string, string>
      timeoutMs?: number
    } = {},
  ): Promise<Response> {
    const user = options.user ?? 'root'
    const { method, path } = envdRoute(route, user)
    let response: Response
    try {
      const headers = new Headers({
        'X-Access-Token': this.token,
        Authorization: `Basic ${btoa(`${user}:`)}`,
        ...options.headers,
      })
      const init = {
        method,
        headers,
        body: options.body,
        redirect: 'manual' as const,
        signal: AbortSignal.timeout(options.timeoutMs ?? 65_000),
        duplex: 'half' as const,
      }
      response = await this.fetch(new Request(new URL(path, this.origin), init))
    } catch {
      throw new ProviderError('unavailable', 503)
    }
    if (!response.ok) {
      let value: unknown = null
      try {
        value = await readBoundedJson(response.body, CONTROL_BUDGET)
      } catch (error) {
        if (error instanceof BodyBudgetExceeded)
          return responseOverflow(budget.kind)
      }
      throw envdError(response, value)
    }
    return response
  }

  async json(
    route: EnvdRoute,
    budget: ResponseBudget,
    options: { body?: Record<string, unknown>; user?: EnvdUser } = {},
  ): Promise<unknown> {
    const response = await this.send(route, budget, {
      user: options.user,
      body: JSON.stringify(options.body ?? {}),
      headers: {
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
      },
    })
    const bytes = await budget.read(response.body, CONTROL_BUDGET)
    try {
      return JSON.parse(new TextDecoder().decode(bytes))
    } catch {
      return invalidResponse()
    }
  }
}

export async function envdSession(
  context: E2bContext,
  id: string,
): Promise<EnvdSession> {
  const reply = await context.control.request({
    operation: 'get',
    sandboxId: id,
  })
  const sandbox = readSandbox(reply.value, id)
  if (sandbox.state !== 'ready') throw new ProviderError('conflict', 409)
  if (!isRecord(reply.value)) return invalidResponse()
  return new EnvdSession(
    `https://49983-${sandboxSegment(id)}.${context.domain}`,
    secretToken(reply.value.envdAccessToken),
    context.fetch,
  )
}
