import type { Agent } from '../../src/shared/agents'
import { readEndpointAddress } from '../../src/shared/endpoint-address'
import type { AgentLogin } from '../chat/login-kind'
import type { HttpFetch } from '../env'
import { readBoundedJson } from '../http/bounded-body'
import { upstreamHeaders } from './headers'

const RESPONSE_BYTES = 1_048_576
const READ_TIMEOUT_MS = 10_000

export type EndpointModelsResult =
  | { status: 'ok'; ids: readonly string[] }
  | { status: 'http-error' }
  | { status: 'unreachable' }

/** Discovery failures carry no upstream text or address to a caller. */
export async function readEndpointModels(
  login: Extract<AgentLogin, { kind: 'endpoint' }>,
  fetch: HttpFetch,
  refusedDomains: readonly string[] = [],
): Promise<EndpointModelsResult> {
  const address = readEndpointAddress(login.endpoint, login.agent, {
    route: login.agent === 'claude' ? '/v1/models' : '/models',
    search: login.agent === 'claude' ? 'limit=1000' : '',
    refusedDomains,
  })
  if (!address) return { status: 'unreachable' }
  const controller = new AbortController()
  let response: Response | undefined
  const failed = (): EndpointModelsResult => ({
    status: response ? 'http-error' : 'unreachable',
  })
  const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS)
  const cancelBody = () => {
    void response?.body?.cancel().catch(() => undefined)
  }
  controller.signal.addEventListener('abort', cancelBody, { once: true })
  try {
    const headers = upstreamHeaders(
      new Headers({ accept: 'application/json' }),
      login,
    )
    if (login.agent === 'claude') headers.set('anthropic-version', '2023-06-01')
    const read = (async (): Promise<EndpointModelsResult> => {
      response = await fetch(
        new Request(address.upstream, {
          method: 'GET',
          headers,
          redirect: 'manual',
          signal: controller.signal,
        }),
      )
      if (controller.signal.aborted) {
        cancelBody()
        return failed()
      }
      if (!response.ok) {
        cancelBody()
        return failed()
      }
      const body =
        response.body?.pipeThrough(
          new TransformStream<Uint8Array, Uint8Array>(),
          { signal: controller.signal },
        ) ?? null
      const ids = modelIds(
        await readBoundedJson(body, RESPONSE_BYTES),
        login.agent,
      )
      return ids === null ? failed() : { status: 'ok', ids }
    })()
    return await Promise.race([
      read,
      new Promise<EndpointModelsResult>((resolve) => {
        controller.signal.addEventListener('abort', () => resolve(failed()), {
          once: true,
        })
      }),
    ])
  } catch {
    return failed()
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', cancelBody)
    controller.abort()
  }
}

function modelIds(value: unknown, agent: Agent): readonly string[] | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('data' in value) ||
    !Array.isArray(value.data)
  )
    return null
  if (agent === 'claude' && 'has_more' in value && value.has_more === true)
    return null
  const ids: string[] = []
  const entries: readonly unknown[] = value.data
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      !('id' in entry) ||
      typeof entry.id !== 'string' ||
      !entry.id.trim()
    )
      return null
    ids.push(entry.id)
  }
  return [...new Set(ids)]
}
