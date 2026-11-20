import type { HttpFetch } from '../../env'
import { isRecord } from '../../http'
import type { TestHarness } from '../../test-support/harness'
import { FakeE2b } from '../../test-support/fake-e2b'
import type { ProviderContractFixture } from '../contract-fixture.test-support'
import type { ProviderErrorKind } from '../errors'
import { E2bClient } from './client'
import { capabilityReply } from './contract-capabilities.test-support'

function providerCodeFor(code: string): string {
  if (code === 'agent_outdated')
    return 'sandbox_snapshot_guest_agent_unresponsive'
  if (code === 'boat_direct_failed') return 'sandbox_create_failed'
  return code
}

const failureStatus: Record<
  Exclude<ProviderErrorKind, 'invalid_response'>,
  number
> = {
  invalid_request: 400,
  unauthorized: 401,
  payment_required: 402,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
}

export function createE2bContractFixture(
  harness: TestHarness,
): ProviderContractFixture {
  const server = new FakeE2b()
  const accountId = crypto.randomUUID()
  let networkFailure = false
  const send: HttpFetch = async (request) => {
    if (networkFailure) throw new Error(`network ${server.apiKey}`)
    return server.fetch(request)
  }
  const provider = new E2bClient({
    accountId,
    apiKey: server.apiKey,
    domain: server.domain,
    templateId: 'base-template',
    db: harness.env.DB,
    encryptionKey: harness.env.BOAT_KEY_ENCRYPTION_KEY,
    fetch: send,
  })
  return {
    provider,
    secret: server.apiKey,
    defaultProviderCode: 'sandbox_create_failed',
    providerCodeFor,
    expectedPort: {
      origin: 'https://3000-sandbox-one.eu.e2b.test',
      credential: {
        headers: { 'e2b-traffic-access-token': server.trafficToken },
        stripHeaders: [
          'e2b-traffic-access-token',
          'x-access-token',
          'e2b-sandbox-id',
          'e2b-sandbox-port',
        ],
        stripCookies: [],
        stripQueryParameters: [],
      },
    },
    async given(reply) {
      server.failure = null
      server.response = null
      server.envd.response = null
      networkFailure = reply.kind === 'network_failure'
      if (reply.kind === 'network_failure') return
      if (reply.kind === 'sandbox') {
        await harness.env.DB.prepare(
          "INSERT INTO e2b_snapshot_mappings (provider_account, name, source_sandbox_id, snapshot_id, state) VALUES (?, 'org-image', 'sandbox-one', 'project/org-image:default', 'ready')",
        )
          .bind(accountId)
          .run()
        server.snapshots.set('org-image', {
          snapshotID: 'project/org-image:default',
          names: ['project/org-image'],
        })
        return
      }
      if (reply.kind === 'snapshot') {
        server.sandboxes.set(reply.value.sourceSandboxId, {
          sandboxID: reply.value.sourceSandboxId,
          state: 'running',
          metadata: {},
        })
        return
      }
      if (reply.kind === 'failure') {
        server.failure = {
          status: failureStatus[reply.errorKind],
          code: providerCodeFor(reply.providerCode ?? 'sandbox_create_failed'),
          retry: reply.retryAfterSeconds,
        }
        return
      }
      if (reply.kind === 'invalid' && reply.target === 'sandbox') {
        server.response = () =>
          Response.json({ sandboxID: 'sandbox-one', state: 'unknown' })
        return
      }
      if (await capabilityReply(server, provider, reply)) return
      throw new Error('Unknown E2B contract capability.')
    },
    createIdentities: () =>
      server.requests.flatMap((request, index) => {
        if (
          request.method !== 'POST' ||
          new URL(request.url).pathname !== '/v2/sandboxes'
        )
          return []
        const body = server.bodies[index]
        return [
          isRecord(body) &&
          isRecord(body.metadata) &&
          typeof body.metadata.conductive_request === 'string'
            ? body.metadata.conductive_request
            : null,
        ]
      }),
  }
}
