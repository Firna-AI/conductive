import { expect, it } from 'vitest'

import { boatRoute } from '../sandbox/routes'
import { TEST_TIME } from '../test-support/harness'
import { setupBackendTests } from './backend-test-hooks'
import { archiveFixture } from './archive-test-support'
import { ARCHIVE_STATE_KEY, type WorkspaceArchiveState } from './archive-types'

const fixtureForTest = setupBackendTests()

it('persists a growing archive safety wait before each provider attempt', async () => {
  const fixture = fixtureForTest()
  const saved = await archiveFixture(fixture, true)
  await fixture.setTime(TEST_TIME + 86_400_000)
  await saved.archive()
  const resume = boatRoute({ operation: 'resume', sandboxId: saved.sandboxId })
  const fetch = fixture.runtime.dependencies.fetch
  const alarms: unknown[] = []
  const retries: unknown[] = []
  fixture.runtime.dependencies.fetch = async (request) => {
    if (
      request.method === resume.method &&
      new URL(request.url).pathname.endsWith(resume.path)
    ) {
      alarms.push(await saved.actor.storage.get('alarm:lifecycle:archive'))
      retries.push(
        (
          await saved.actor.storage.get<WorkspaceArchiveState>(
            ARCHIVE_STATE_KEY,
          )
        )?.retry,
      )
      return Response.json({ ok: false, code: 'unavailable' }, { status: 503 })
    }
    return fetch(request)
  }
  const restart = TEST_TIME + 13 * 86_400_000
  await fixture.advanceTo(restart, saved.id)
  await fixture.advanceTo(restart + 30_000, saved.id)
  expect(alarms).toEqual([restart + 30_000, restart + 90_000])
  expect(retries).toEqual([
    { failures: 1, at: restart + 30_000 },
    { failures: 2, at: restart + 90_000 },
  ])
})
