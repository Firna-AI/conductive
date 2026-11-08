import { afterEach, beforeAll, beforeEach, expect, it } from 'vitest'

import { realRuntimeFixture, runtimeBundle } from './real-runtime-test-support'
import { queueRuntimeCreate } from './runtime-lifecycle-test-support'

let bundle: string
let fixture: Awaited<ReturnType<typeof realRuntimeFixture>>
beforeAll(async () => {
  bundle = await runtimeBundle()
})
beforeEach(async () => {
  fixture = await realRuntimeFixture(bundle)
})
afterEach(async () => {
  await fixture.dispose()
})

// A throw inside blockConcurrencyWhile resets the native object, which
// loses the start and leaves the workspace in Starting.
it('fails the start of a refused first message on the native object without a reset', async () => {
  await fixture.env.DB.prepare(
    "DELETE FROM agent_logins WHERE user_id = 'runtime-user'",
  ).run()
  const { actor } = await queueRuntimeCreate(fixture, 'runtime-refused')
  for (let step = 0; step < 16 && (await actor.checkpoint()); step++)
    await actor.tick()
  expect(await actor.waitCreationLifecycle()).toMatchObject({
    ok: false,
    error: { code: 'agent_login_required' },
  })
  expect(await actor.checkpoint()).toBeUndefined()
})
