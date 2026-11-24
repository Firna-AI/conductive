import { expect, it, vi } from 'vitest'
import { createApiClient } from '../app/api/client'
import { ManualDelay, requestLines } from '../app/test-kit'
import { Store } from '../app/store'
import { githubPaths, type GitHubCapabilities } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { BarActions } from './barActions'
import type { AccessMemory } from './barPorts'
import type { CapabilityState } from './barView'
import { createContinueActions } from './continueActions'
import { createGitHubActions } from './githubActions'
import type { FetchLike } from './githubClient'
import type { GitHubState } from './githubStore'
import { barWorkspaceStream } from './storeDoubles'
import { snapshotOf } from './testing'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }
const capabilitiesPath = githubPaths.capabilities(
  target.orgId,
  target.workspaceId,
)
const remembered: GitHubCapabilities = { canWrite: true, mergeMethod: 'merge' }
const shortly = { timeout: 10_000 }

/** A memory of one repository, as the org model keeps it. */
function memoryOf(start: GitHubCapabilities | undefined) {
  const kept: { value: GitHubCapabilities | undefined } = { value: start }
  const memory: AccessMemory = {
    get: () => kept.value,
    set: (value) => {
      kept.value = value
    },
  }
  return { kept, memory }
}

function barFor(
  fetch: FetchLike,
  access?: AccessMemory,
  stream = barWorkspaceStream().stream,
): BarActions {
  return new BarActions({
    branch: 'calummoore/checkout-autocomplete',
    github: createGitHubActions(fetch, target),
    continues: createContinueActions(createApiClient(fetch), target),
    sendPrompt: async () => 'sent',
    delay: new ManualDelay().delay,
    githubState: new Store<GitHubState>({
      status: 'ready',
      snapshot: snapshotOf('ready-to-merge'),
    }),
    refreshGitHub: () => undefined,
    streamLast: stream.last,
    reconnects: stream.reconnects,
    ...(access ? { access } : {}),
  })
}

const accessOf = (actions: BarActions): CapabilityState =>
  actions.getSnapshot().capabilities

it('shows remembered access through the seed, then keeps the first fresh answer', async () => {
  const server = new FakeApiServer()
  const { kept, memory } = memoryOf(remembered)
  const { stream, start } = barWorkspaceStream()
  const actions = barFor(server.fetch, memory, stream)
  const first = accessOf(actions)
  actions.connect()
  start(19)
  await vi.waitFor(
    () => expect(kept.value).toEqual({ canWrite: true, mergeMethod: 'squash' }),
    shortly,
  )

  expect(first).toEqual({ status: 'ready', capabilities: remembered })
  expect(requestLines(server)).toEqual([`GET ${capabilitiesPath}`])
  expect(accessOf(actions)).toEqual({
    status: 'ready',
    capabilities: { canWrite: true, mergeMethod: 'squash' },
  })
})

it('loads without a remembered access, and remembers the answer', async () => {
  const { kept, memory } = memoryOf(undefined)
  const actions = barFor(new FakeApiServer().fetch, memory)
  const first = accessOf(actions)
  actions.connect()
  await vi.waitFor(() => expect(kept.value).toBeDefined(), shortly)

  expect(first).toEqual({ status: 'loading' })
  expect(accessOf(actions).status).toBe('ready')
})

it('forgets the access after a failed read, so the bar offers no Merge', async () => {
  const server = new FakeApiServer()
  server.json(
    'GET',
    capabilitiesPath,
    { error: { code: 'x', message: 'x' } },
    502,
  )
  const { kept, memory } = memoryOf(remembered)
  const actions = barFor(server.fetch, memory)
  actions.connect()
  await vi.waitFor(
    () => expect(accessOf(actions).status).toBe('failed'),
    shortly,
  )

  expect(kept.value).toBeUndefined()
})

it('keeps the remembered access when the bar stops before the answer', async () => {
  const never: FetchLike = (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('Stopped', 'AbortError')),
      )
    })
  const { kept, memory } = memoryOf(remembered)
  const stop = barFor(never, memory).connect()

  stop()
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(kept.value).toEqual(remembered)
})
