import type { HttpFetch } from '../env'
import { FakeBoat } from '../test-support/fake-boat'
import { BoatClient } from './boat'
import { boatContractReplies } from './boat-contract-replies.test-support'
import type { ProviderContractFixture } from './contract-fixture.test-support'
import { boatRoute } from './routes'

export function createBoatContractFixture(): ProviderContractFixture {
  const server = new FakeBoat()
  const secret = 'boat-first'
  let networkFailure = false
  const send: HttpFetch = async (request) => {
    if (networkFailure) throw new Error(`network ${secret}`)
    return server.fetch(request)
  }
  const create = boatRoute({ operation: 'create' })
  return {
    provider: new BoatClient(secret, send, 'app-org'),
    secret,
    expectedPort: {
      origin: 'https://sandbox-3000.on.boat.dev',
      credential: {
        headers: { Cookie: '_port_auth=server-port-token' },
        stripCookies: ['_port_auth'],
        stripHeaders: [],
        stripQueryParameters: ['_token', '_port_auth'],
      },
    },
    given(reply) {
      server.failure = null
      server.responseOverride = null
      server.responseFactories = []
      networkFailure = reply.kind === 'network_failure'
      if (reply.kind === 'network_failure') return
      const responses = boatContractReplies(reply, secret)
      if (responses.length === 1) server.responseOverride = responses[0]
      else
        server.responseFactories = responses.map((response) => () => response)
    },
    createIdentities: () =>
      server.requests
        .filter(
          (request) =>
            request.method === create.method &&
            new URL(request.url).pathname.replace('/api/v1', '') ===
              create.path,
        )
        .map((request) => request.headers.get('Idempotency-Key')),
  }
}
