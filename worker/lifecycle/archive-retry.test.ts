import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { archiveFixture } from './archive-test-support'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'
import { repairLifecycleAlarms } from './repair'
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
  const state =
    await saved.actor.storage.get<WorkspaceArchiveState>(ARCHIVE_STATE_KEY)
  expect(state).toMatchObject({ phase: 'wait' })
  expect(state?.retry).toBeUndefined()
})
