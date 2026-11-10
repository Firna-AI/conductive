import { afterEach, beforeAll, expect, it } from 'vitest'

import { outerWorkerBundle } from '../chat/integration/outer-runtime.test-support'
import { OUTER_ORG } from '../chat/integration/outer-seed.test-support'
import {
  featureFixture,
  featureState,
  type FeatureFixture,
} from './fixture.test-support'

let bundle: string
let fixture: FeatureFixture | undefined
beforeAll(async () => {
  bundle = await outerWorkerBundle('worker/features/entry.test-support.ts')
})
afterEach(async () => {
  await fixture?.dispose()
})

it('runs security deadlines through lifecycle fences and retains deferred feature deadlines', async () => {
  const active = (fixture = await featureFixture(bundle))
  const due = (await active.actor().testAlarmTime()) + 60_000
  for (const mode of ['suspended', 'purged', 'active'] as const) {
    await active.actor().seedFeatureState({
      'members:lifecycle-fence': { orgId: OUTER_ORG, generation: 100, mode },
      'alarm:devices': due,
      'alarm:github': due,
    })
    await active.actor().runSecurityAlarmAt(due)
    const state = featureState(await active.actor().inspectFeatureState())
    expect(state.has('alarm:devices'), mode).toBe(false)
    expect(state.get('alarm:github'), mode).toBe(due)
    expect(state.get('security:regular-alarms-deferred-until'), mode).toEqual(
      expect.any(Number),
    )
    expect(state.get('members:lifecycle-fence'), mode).toEqual({
      orgId: OUTER_ORG,
      generation: 100,
      mode,
    })
  }
})
