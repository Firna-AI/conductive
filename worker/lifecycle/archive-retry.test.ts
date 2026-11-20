import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { boatRoute } from '../sandbox/routes'
import { requireFeatureResult } from '../features/result'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { archiveFixture } from './archive-test-support'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'
import { repairLifecycleAlarms } from './repair'
import { workspaceOwnerChangedHook } from './ownership-maintenance'
import { readWorkspace } from './workspace-data'

const fixtureForTest = setupBackendTests()
const day = 86_400_000

it('waits longer after each refused archive restart, keeps Retry-After up to one hour, and holds the repair timer', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + day)
  await saved.archive()
  const route = boatRoute({ operation: 'resume', sandboxId: saved.sandboxId })
  const refusals = [
    () =>
      Response.json(
        { ok: false, code: 'sandbox_stopping' },
        { status: 409, headers: { 'Retry-After': '120' } },
      ),
    () => Response.json({ ok: false, code: 'unavailable' }, { status: 503 }),
    () =>
      Response.json(
        { ok: false, code: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': '7200' } },
      ),
  ]
  let resumes = 0
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    if (
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      resumes++
      const refusal = refusals.shift()
      if (refusal) return refusal()
    }
    return fetch(request)
  }
  const retryAlarm = () => saved.actor.storage.get('alarm:lifecycle:archive')
  const restart = TEST_TIME + 13 * day

  await fixture.advanceTo(restart, saved.id)
  expect(await retryAlarm()).toBe(restart + 120_000)
  expect(
    (await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id))
      .nextDiskKeepaliveAt,
  ).toBe(restart + 120_000)

  await fixture.advanceTo(restart + 120_000, saved.id)
  expect(await retryAlarm()).toBe(restart + 180_000)

  await fixture.advanceTo(restart + 180_000, saved.id)
  expect(await retryAlarm()).toBe(restart + 3_780_000)
  expect(resumes).toBe(3)

  await fixture.setTime(restart + 1_980_000)
  expect(
    await repairLifecycleAlarms(
      fixture.runtime,
      fixture.images,
      () => SOFTWARE,
    ),
  ).toEqual({ workspaces: 0, orgs: 0, pendingWorkspaces: 0, pendingOrgs: 0 })
  await fixture.advanceTo(restart + 1_980_000, saved.id)
  expect(resumes).toBe(3)

  await fixture.advanceTo(restart + 3_780_000, saved.id)
  expect(resumes).toBe(4)
  expect(fixture.boat.resumeIds).toEqual([saved.sandboxId])
  expect(
    await saved.actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY),
  ).toMatchObject({ phase: 'wait' })

  // The restart succeeded, so the refused stops start again at 30 seconds.
  fixture.boat.failStop = true
  const stopWaits = [
    30_000, 60_000, 120_000, 240_000, 480_000, 960_000, 1_920_000, 3_600_000,
    3_600_000,
  ]
  let at = restart + 3_785_000
  for (const [index, wait] of stopWaits.entries()) {
    await fixture.advanceTo(at, saved.id)
    at += wait
    expect(await retryAlarm(), `wait after refused stop ${index + 1}`).toBe(at)
  }
  expect(fixture.boat.stopIds).toHaveLength(stopWaits.length)
})

it('keeps archive waits across early and recovered alarms, allows one access repair, and stops at once for Restore', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + day)
  await saved.archive()
  const route = boatRoute({ operation: 'resume', sandboxId: saved.sandboxId })
  let resumes = 0
  const fetch = fixture.runtime.dependencies.fetch
  fixture.runtime.dependencies.fetch = async (request) => {
    if (
      request.method === route.method &&
      new URL(request.url).pathname.endsWith(route.path)
    ) {
      resumes++
      if (resumes <= 2)
        return Response.json(
          { ok: false, code: 'unavailable' },
          {
            status: 503,
            headers: resumes === 1 ? { 'Retry-After': '3600' } : {},
          },
        )
    }
    return fetch(request)
  }
  const retryAlarm = () => saved.actor.storage.get('alarm:lifecycle:archive')
  const retryState = () =>
    saved.actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY)
  const restart = TEST_TIME + 13 * day

  await fixture.advanceTo(restart, saved.id)
  expect(resumes).toBe(1)
  expect((await retryState())?.retry).toEqual({
    failures: 1,
    at: restart + 3_600_000,
  })
  const requests = fixture.boat.server.requests.length

  await saved.actor.storage.setAlarm(restart + 1_000)
  await fixture.advanceTo(restart + 1_000, saved.id)
  expect(resumes).toBe(1)
  expect(fixture.boat.server.requests).toHaveLength(requests)
  expect(await retryAlarm()).toBe(restart + 3_600_000)

  await saved.actor.storage.put('alarm:lifecycle:run', restart + 2_000)
  await saved.actor.restart()
  await saved.actor.storage.setAlarm(restart + 2_000)
  await fixture.advanceTo(restart + 2_000, saved.id)
  expect(resumes).toBe(1)
  expect(fixture.boat.server.requests).toHaveLength(requests)
  expect(await retryAlarm()).toBe(restart + 3_600_000)
  expect(await saved.actor.storage.get('alarm:lifecycle:run')).toBeUndefined()

  await fixture.setTime(restart + 3_000)
  await workspaceOwnerChangedHook(fixture.runtime)(saved.id)
  await fixture.advanceTo(restart + 3_000, saved.id)
  expect(resumes).toBe(2)
  expect((await retryState())?.retry).toEqual({
    failures: 2,
    at: restart + 63_000,
  })
  expect(await retryAlarm()).toBe(restart + 63_000)
  expect(
    (await readWorkspace(fixture.runtime.env.DB, fixture.org.id, saved.id))
      .nextDiskKeepaliveAt,
  ).toBe(restart + 63_000)

  await saved.actor.storage.setAlarm(restart + 4_000)
  await fixture.advanceTo(restart + 4_000, saved.id)
  expect(resumes).toBe(2)
  expect(await retryAlarm()).toBe(restart + 63_000)

  await fixture.advanceTo(restart + 63_000, saved.id)
  expect(resumes).toBe(3)
  fixture.boat.failStop = true
  await fixture.advanceTo(restart + 68_000, saved.id)
  expect(fixture.boat.stopIds).toEqual([saved.sandboxId])
  expect((await retryState())?.retry).toEqual({
    failures: 1,
    at: restart + 98_000,
  })

  fixture.boat.failStop = false
  await fixture.setTime(restart + 69_000)
  const restored = requireFeatureResult(await saved.restore())
  expect(restored.workspace.state).toBe('stopped')
  expect(fixture.boat.stopIds).toEqual([saved.sandboxId, saved.sandboxId])
  expect(fixture.boat.states.get(saved.sandboxId)).toBe('archived')
  expect(resumes).toBe(3)
  expect(await retryState()).toBeUndefined()
})
