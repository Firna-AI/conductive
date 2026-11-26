import { expect, it } from 'vitest'

import { SOFTWARE } from '../lifecycle/backend-test-support'
import { readBuild, readBuildJob, runningBuild } from '../lifecycle/build-data'
import { startImageBuild } from '../lifecycle/image-builds'
import { progressProviderSwitch } from '../lifecycle/provider-switch-builds'
import {
  requestSwitch,
  setupSwitchTests,
} from '../lifecycle/provider-switch.test-support'
import { liftOrgSuspension, liftUserSuspension } from './lift'
import { suspendOrg } from './suspend-org'
import { suspendUser } from './suspend-user'
import { joinedMember } from './suspension-test-support'

const fixtureForTest = setupSwitchTests()

it('pauses a switch and its waiting member build on org suspension and restarts the switch after Lift', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const original = await runningBuild(runtime.env.DB, org.id)
  if (!original) throw new Error('Missing initial switch build')
  const memberBuild = await startImageBuild(images, {
    orgId: org.id,
    userId: user.id,
    kind: 'build',
    software: SOFTWARE,
  })
  expect(await readBuildJob(runtime.env.DB, org.id, memberBuild)).toMatchObject(
    {
      state: 'running',
      waitingForSwitchId: record.id,
    },
  )
  await suspendOrg(runtime, org.id, user.id)
  expect
    .soft(await readBuildJob(runtime.env.DB, org.id, original))
    .toMatchObject({
      state: 'failed',
      phase: 'done',
    })
  expect
    .soft(await readBuildJob(runtime.env.DB, org.id, memberBuild))
    .toMatchObject({
      state: 'failed',
      phase: 'done',
    })
  expect(
    (await readBuild(runtime.env.DB, org.id, memberBuild)).build.error,
  ).toBe(
    'This org is suspended. For questions, write to abuse@conductive.build.',
  )
  expect.soft(await record.read()).toMatchObject({
    state: 'waiting',
    waitReason: 'suspended',
    failure: null,
  })
  await liftOrgSuspension(runtime, org.id, user.id)
  const restarted = await record.read()
  expect(restarted).toMatchObject({ state: 'building', waitReason: null })
  expect(restarted?.buildId).not.toBe(original)
  expect(await runningBuild(runtime.env.DB, org.id)).toBe(restarted?.buildId)
})

it('restarts a suspended switch starter’s build for another active admin', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user } = fixture
  const record = await requestSwitch(fixture)
  await progressProviderSwitch(images, org.id)
  const original = await runningBuild(runtime.env.DB, org.id)
  if (!original) throw new Error('Missing initial switch build')
  const other = await joinedMember(fixture)
  await runtime.env.DB.prepare(
    "UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?",
  )
    .bind(org.id, other.id)
    .run()
  expect(await readBuildJob(runtime.env.DB, org.id, original)).toMatchObject({
    startedByUserId: user.id,
    state: 'running',
  })
  await suspendUser(runtime, user.githubId, other.id)
  expect
    .soft(await readBuildJob(runtime.env.DB, org.id, original))
    .toMatchObject({
      state: 'failed',
      phase: 'done',
    })
  const restarted = await record.read()
  expect(restarted).toMatchObject({ state: 'building', waitReason: null })
  expect(restarted?.buildId).not.toBe(original)
  expect(
    await readBuildJob(runtime.env.DB, org.id, restarted?.buildId ?? ''),
  ).toMatchObject({ state: 'running', startedByUserId: other.id })
})

it('starts a waiting switch after its sole admin is lifted even when the admin owns no workspace', async () => {
  const fixture = await fixtureForTest()
  const { runtime, images, org, user } = fixture
  const other = await joinedMember(fixture)
  const record = await requestSwitch(fixture)
  await suspendUser(runtime, user.githubId, other.id)
  await progressProviderSwitch(images, org.id)
  expect(await record.read()).toMatchObject({
    state: 'waiting',
    waitReason: 'admin',
    buildId: null,
  })
  expect(await runningBuild(runtime.env.DB, org.id)).toBeNull()
  await liftUserSuspension(runtime, user.githubId, other.id)
  const started = await record.read()
  expect(started).toMatchObject({
    state: 'building',
    waitReason: null,
    buildId: expect.any(String),
  })
  expect(
    await readBuildJob(runtime.env.DB, org.id, started?.buildId ?? ''),
  ).toMatchObject({ state: 'running', startedByUserId: user.id })
})
