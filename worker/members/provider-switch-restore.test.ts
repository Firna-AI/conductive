import { expect, it } from 'vitest'

import { readBuildJob, runningBuild } from '../lifecycle/build-data'
import { progressProviderSwitch } from '../lifecycle/provider-switch-builds'
import {
  requestSwitch,
  setupSwitchTests,
} from '../lifecycle/provider-switch.test-support'
import { productionMembersHooks } from './composition'
import { deleteOrg } from './deletion'
import { restoreOrg } from './restore'

const fixtureForTest = setupSwitchTests()

it('keeps a deleted switch waiting and restarts its build only after Restore activates the org', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user } = fixture
  const { env, dependencies } = runtime
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const original = await runningBuild(env.DB, org.id)
  if (!original) throw new Error('Missing initial switch build')
  const hooks = productionMembersHooks(env, dependencies)
  const deleted = await deleteOrg(
    env,
    org.id,
    user.id,
    org.name,
    dependencies,
    hooks,
  )
  expect(deleted.deletion).toMatchObject({ deletedAt: dependencies.now() })
  expect(await readBuildJob(env.DB, org.id, original)).toMatchObject({
    state: 'failed',
    phase: 'done',
  })
  expect.soft(await record.read()).toMatchObject({
    state: 'waiting',
    waitReason: 'deleted',
    failure: null,
  })
  let handoff: { deletedAt: number | null; running: string | null } | undefined
  const restored = await restoreOrg(env, org.id, user.id, dependencies, {
    ...hooks,
    async restoreOrgMaintenance(input) {
      handoff = {
        deletedAt: await env.DB.prepare(
          'SELECT deleted_at FROM orgs WHERE id = ?',
        )
          .bind(org.id)
          .first<number>('deleted_at'),
        running: await runningBuild(env.DB, org.id),
      }
      await hooks.restoreOrgMaintenance(input)
    },
  })
  expect(handoff).toEqual({ deletedAt: dependencies.now(), running: null })
  expect(restored.deletion).toBeUndefined()
  const restarted = await record.read()
  expect(restarted).toMatchObject({
    state: 'building',
    waitReason: null,
    buildId: expect.any(String),
  })
  expect(restarted?.buildId).not.toBe(original)
  expect(await runningBuild(env.DB, org.id)).toBe(restarted?.buildId)
})
