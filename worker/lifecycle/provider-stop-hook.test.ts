import { afterEach, beforeAll, expect, it } from 'vitest'

import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import {
  OUTER_ORG,
  OUTER_WORKSPACE,
} from '../chat/integration/outer-seed.test-support'
import {
  featureFixture,
  type FeatureFixture,
} from '../features/fixture.test-support'
import type { Workspace } from './provider-stop-entry.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle(
    'worker/lifecycle/provider-stop-entry.test-support.ts',
  )
})
afterEach(async () => {
  await fixture?.dispose()
})

it.each([
  {
    scenario: 'matching stop',
    state: 'stopped',
    markAt: 100,
    appStop: undefined,
    expected: true,
  },
  {
    scenario: 'stale mark',
    state: 'stopped',
    markAt: 99,
    appStop: undefined,
    expected: false,
  },
  {
    scenario: 'provider error',
    state: 'error',
    markAt: 100,
    appStop: undefined,
    expected: false,
  },
  {
    scenario: 'app stop',
    state: 'stopped',
    markAt: 100,
    appStop: { at: 90 },
    expected: false,
  },
] as const)(
  'passes the $scenario flag to the chat stop hook',
  async ({ state, markAt, appStop, expected }) => {
    const active = (fixture = await featureFixture(bundle))
    const bindings = await active.runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
    }>()
    const actor = bindings.WORKSPACES.getByName(OUTER_WORKSPACE)
    await actor.seedFeatureState({
      'lifecycle:state': {
        workspaceId: OUTER_WORKSPACE,
        orgId: OUTER_ORG,
        state,
        start: null,
        pendingFirstMessage: null,
        lastActivityAt: await actor.testAlarmTime(),
        runningSessions: [],
        runnerConnected: false,
        stoppedAt: 100,
        providerStop: { at: markAt },
        appStop,
        nextDiskKeepaliveAt: null,
        error: null,
      },
    })
    await actor.publishLifecycle()
    expect(await actor.takeStops()).toEqual([
      { id: OUTER_WORKSPACE, providerStop: expected },
    ])
  },
)
