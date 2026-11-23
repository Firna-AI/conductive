import { describe, expect, it, vi } from 'vitest'
import { ManualDelay, ManualFocus } from '../../app/test-kit'
import type { ServiceControlRequest } from '../../shared/generated/ServiceControlRequest'
import { readServiceControlRequest } from '../../shared/service-inputs'
import { servicePaths } from '../../shared/services'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  SERVICE_BOOT,
  serviceList,
  webRow,
} from '../../test-support/fixtures/services'
import type { ApiFetch } from '../../terminal/tool-parts/request'
import type { ServiceAnswer } from './serviceAnswer'
import { ServicesStore } from './servicesStore'

const { org, workspace } = FAKE_IDS
const cataloguePath = servicePaths.catalogue(org, workspace)
const controlPath = servicePaths.control(org, workspace)
const target = {
  bootId: SERVICE_BOOT,
  serviceId: webRow.serviceId,
  generation: webRow.generation,
}

/** A store of the fake workspace, whose requests take the IDs `request-N`. */
function storeOf(fetch: ApiFetch): ServicesStore {
  let id = 0
  return new ServicesStore(
    { orgId: org, workspaceId: workspace },
    {
      fetch,
      delay: new ManualDelay().delay,
      onFocus: new ManualFocus().onFocus,
      visible: { get: () => true, subscribe: () => () => undefined },
      newId: () => `request-${++id}`,
    },
  )
}

/** A connection that gets no event of the workspace. */
const noEvents = () => () => undefined

function refusal(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status })
}

describe('the services of a workspace', () => {
  it('reads the not_found of an older Worker as no services, keeps a shown list after a failed read, and forgets it when the period ends', async () => {
    const server = new FakeApiServer()
    server.response(
      'GET',
      cataloguePath,
      refusal('not_found', 'The page is not available.', 404),
    )
    const store = storeOf(server.fetch)
    const stop = store.connect(noEvents)
    await vi.waitFor(() =>
      expect(store.getSnapshot().catalogue).toEqual({ state: 'unsupported' }),
    )
    server.json('GET', cataloguePath, serviceList())
    await store.refresh()
    const shown = store.getSnapshot().catalogue
    server.response(
      'GET',
      cataloguePath,
      refusal('sandbox_unavailable', 'The cloud computer did not answer.', 502),
    )
    await store.refresh()
    const { catalogue: kept, failed } = store.getSnapshot()
    stop()

    expect({ shown, kept, failed, ended: store.getSnapshot() }).toEqual({
      shown: serviceList(),
      kept: serviceList(),
      failed: null,
      ended: { catalogue: null, failed: null, pending: new Map() },
    })
  })

  it('shows a first read that fails with workspace_not_found as its error, not as older software', async () => {
    const server = new FakeApiServer()
    const message = 'The workspace is not available.'
    server.response(
      'GET',
      cataloguePath,
      refusal('workspace_not_found', message, 404),
    )
    const store = storeOf(server.fetch)
    store.connect(noEvents)
    await vi.waitFor(() => expect(store.getSnapshot().failed).not.toBeNull())

    expect(store.getSnapshot()).toEqual({
      catalogue: null,
      failed: { code: 'workspace_not_found', message },
      pending: new Map(),
    })
  })

  const answers: readonly {
    name: string
    reply: (request: ServiceControlRequest) => Promise<Response>
    answer: ServiceAnswer
  }[] = [
    {
      name: 'a lost connection',
      reply: () => Promise.reject(new TypeError('Failed to fetch')),
      answer: { kind: 'unconfirmed' },
    },
    {
      name: 'a reply without the error of the API',
      reply: async () => new Response('Bad gateway', { status: 502 }),
      answer: { kind: 'unconfirmed' },
    },
    {
      name: 'the answer of another request',
      reply: async (request) =>
        Response.json({
          request: { ...request, requestId: 'another' },
          outcome: { state: 'applied' },
        }),
      answer: { kind: 'unconfirmed' },
    },
    {
      name: 'a refusal of the API',
      reply: async () =>
        refusal('sandbox_not_ready', 'Open the workspace to start it.', 409),
      answer: { kind: 'failed', message: 'Open the workspace to start it.' },
    },
    {
      name: 'a run that ended first',
      reply: async (request) =>
        Response.json({ request, outcome: { state: 'stale' } }),
      answer: { kind: 'stale' },
    },
  ]

  for (const { name, reply, answer } of answers) {
    it(`sends a Restart once with the observed run and a new request ID, and answers ${name}`, async () => {
      const server = new FakeApiServer()
      const sent: unknown[] = []
      server.handle('POST', controlPath, async (http) => {
        const body: unknown = await http.json()
        sent.push(body)
        return reply(readServiceControlRequest(body))
      })
      server.json('GET', cataloguePath, serviceList())
      const store = storeOf(server.fetch)
      store.connect(noEvents)
      const got: ServiceAnswer[] = []
      store.control(target, 'restart', (each) => got.push(each))
      await vi.waitFor(() => expect(got).toHaveLength(1))
      // The list reads the actual state after the answer.
      await store.refresh()

      expect({ sent, got, pending: store.getSnapshot().pending }).toEqual({
        sent: [{ requestId: 'request-1', target, action: 'restart' }],
        got: [answer],
        pending: new Map(),
      })
    })
  }
})
