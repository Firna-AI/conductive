import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { readOrgSwitchContext } from '../operator/switch-context-data'
import { runningBuild } from './build-data'
import { setupSwitchTests, requestSwitch } from './provider-switch.test-support'

const fixtureForTest = setupSwitchTests()

it('selects the executing build while a later member build waits', async () => {
  const fixture = await fixtureForTest()
  const { env } = fixture.images
  const record = await requestSwitch(fixture)
  await env.DB.prepare(
    `INSERT INTO image_builds (id, org_id, kind, state, settings_revision,
     runner_protocol_version, started_at, operator_switch_id, waiting_for_switch_id)
     VALUES ('executing', ?, 'build', 'running', 1, 2, ?, ?, NULL),
       ('waiting', ?, 'build', 'running', 1, 2, ?, NULL, ?)`,
  )
    .bind(
      fixture.org.id,
      TEST_TIME,
      record.id,
      fixture.org.id,
      TEST_TIME + 1,
      record.id,
    )
    .run()
  expect(await runningBuild(env.DB, fixture.org.id)).toBe('executing')
  expect(
    (await readOrgSwitchContext(env.DB, fixture.org.id)).runningJob?.id,
  ).toBe('executing')
})
