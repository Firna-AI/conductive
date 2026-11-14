import { readEndpointAddress } from '../../src/shared/endpoint-address'
import type { AgentLogin } from '../chat/login-kind'
import type { HttpFetch } from '../env'
import { readEndpointModels } from './endpoint-models'

interface EndpointModelsForSave {
  endpoint: string
  ids: readonly string[] | null
  endpointV1Added: boolean
}

/** Only a save can select a different base, before encryption and storage. */
export async function readEndpointModelsForSave(
  login: Extract<AgentLogin, { kind: 'endpoint' }>,
  fetch: HttpFetch,
  refusedDomains: readonly string[] = [],
): Promise<EndpointModelsForSave> {
  const first = await readEndpointModels(login, fetch, refusedDomains)
  const saved: EndpointModelsForSave = {
    endpoint: login.endpoint,
    ids: first.status === 'ok' ? first.ids : null,
    endpointV1Added: false,
  }
  if (login.agent !== 'codex' || first.status !== 'http-error') return saved
  const url = new URL(login.endpoint)
  if (url.pathname.endsWith('/v1')) return saved
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1`
  const address = readEndpointAddress(url.href, login.agent, { refusedDomains })
  if (!address) return saved
  const second = await readEndpointModels(
    { ...login, endpoint: address.endpoint },
    fetch,
    refusedDomains,
  )
  return second.status === 'ok'
    ? { endpoint: address.endpoint, ids: second.ids, endpointV1Added: true }
    : saved
}
