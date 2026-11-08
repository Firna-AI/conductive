import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'

const fixtureForTest = setupBackendTests()

it('advances a restored image coordinator from its shared lifecycle alarm', async () => {
  const fixture = fixtureForTest()
  const now = fixture.runtime.dependencies.now()
  const id = `org-image:${fixture.org.id}`
  fixture.runtime.workspace(id)
  const actor = fixture.actors.get(id)
  if (!actor) throw new Error('The image coordinator is missing.')
  await fixture.runtime.env.DB.prepare(
    'UPDATE settings SET next_image_refresh_at = ? WHERE org_id = ?',
  )
    .bind(now + 60_000, fixture.org.id)
    .run()
  await actor.storage.put('image', 'org-image:coordinator', {
    orgId: fixture.org.id,
    software: SOFTWARE,
    nextAt: now,
    buildId: null,
  })
  await actor.storage.put('number', 'alarm:lifecycle', now)
  await actor.storage.setAlarm(now)
  await fixture.advanceTo(now, id)
  expect(
    await actor.storage.get('image', 'org-image:coordinator'),
  ).toMatchObject({
    nextAt: now + 60_000,
  })
  expect(actor.storage.alarmAt).toBe(now + 60_000)
  expect(await actor.storage.get('number', 'alarm:lifecycle')).toBeUndefined()
})
