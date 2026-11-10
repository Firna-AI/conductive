import { expect, it } from 'vitest'

import { TEST_TIME } from '../test-support/harness'
import { boatRoute } from '../sandbox/routes'
import { setupBackendTests } from './backend-test-hooks'
import { readBuild } from './build-data'
import { imageRetryFixture } from './retry-test-support'
import { readOrgImage } from './org-image-data'

const backendFixture = setupBackendTests()

it.each([
  {
    cause: 'expiry',
    endAt: TEST_TIME + 3_600_000,
    message:
      'The cloud computer image did not build within the 60-minute limit. Check the log and try again.',
  },
  {
    cause: 'retry exhaustion',
    endAt: TEST_TIME + 600_000,
    message:
      'The cloud computer image could not build. Check the log and try again.',
  },
  {
    cause: 'a refused replay',
    endAt: TEST_TIME + 1_000,
    message:
      'The cloud computer image could not build. Check the log and try again.',
  },
] as const)(
  'retains dispatched image allocation cleanup after $cause and deletes the recovered computer before done',
  async ({ cause, endAt, message }) => {
    const fixture = await backendFixture()
    const image = await imageRetryFixture(fixture, { steps: 0 })
    const create = boatRoute({ operation: 'create' })
    const fetch = fixture.runtime.dependencies.fetch
    const requests: { key: string | null; body: string }[] = []
    let recovering = false
    fixture.runtime.dependencies.fetch = async (request) => {
      if (
        request.method !== create.method ||
        !new URL(request.url).pathname.endsWith(create.path)
      )
        return fetch(request)
      requests.push({
        key: request.headers.get('Idempotency-Key'),
        body: await request.clone().text(),
      })
      const response = await fetch(request)
      if (recovering) return response
      return Response.json(
        { ok: false, code: 'unavailable' },
        {
          status:
            cause === 'a refused replay' && requests.length > 1 ? 401 : 503,
        },
      )
    }
    await image.tick(TEST_TIME)
    expect(await image.job()).toMatchObject({
      state: 'running',
      phase: 'allocating',
      sandboxId: null,
    })
    expect(fixture.boat.states.size).toBe(1)
    await image.restart()
    await image.tick(endAt)

    expect(await image.job()).toMatchObject({
      state: 'failed',
      phase: 'allocating',
      sandboxId: null,
    })
    expect(
      (await readBuild(fixture.runtime.env.DB, fixture.org.id, image.id)).build,
    ).toMatchObject({ error: message, completedAt: endAt })
    expect(fixture.boat.deletedIds).toEqual([])
    expect(await image.storage.getAlarm()).not.toBeNull()
    recovering = true
    fixture.boat.deleteFailures = 1
    await image.restart()
    await image.tick(endAt + 30_000)
    expect(await image.job()).toMatchObject({
      state: 'failed',
      phase: 'cleanup',
      sandboxId: 'bx_1',
    })
    const allocations = requests.length
    await image.restart()
    await image.tick(endAt + 60_000)
    expect(await image.job()).toMatchObject({
      state: 'failed',
      phase: 'done',
      sandboxId: null,
    })
    expect(requests).toHaveLength(allocations)
    expect(requests).toEqual(
      Array.from({ length: allocations }, () => requests[0]),
    )
    expect(fixture.boat.deletedIds).toEqual(['bx_1'])
    expect(fixture.boat.states.size).toBe(0)
    expect(
      await readOrgImage(fixture.runtime.env.DB, fixture.org.id, 'boat'),
    ).toMatchObject({ imageName: 'last-good-image' })
  },
)
