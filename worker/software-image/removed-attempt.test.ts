import { afterEach, expect, it, vi } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { SOFTWARE_RELEASE as SOFTWARE } from '../lifecycle/software-release-test-support'
import { boatRoute } from '../sandbox/routes'
import { heldOperation } from '../test-support/held-operation'
import { softwareImages } from './data'
import { holdSoftwareImageDeploy, softwareImagePoll } from './poll.test-support'
import {
  seedReadySoftwareImage,
  softwareImageReleaseFixture,
} from './test-support'
import { softwareVersion } from './version'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.useRealTimers())

async function admittedReadyImage() {
  const { images, boat } = fixtureForTest()
  const release = softwareImageReleaseFixture(images)
  const name = await seedReadySoftwareImage(images.env.DB, 'removed')
  const poll = await softwareImagePoll(images)
  expect(await (await poll.request()).json()).toMatchObject({ state: 'ready' })
  release.current = { ...SOFTWARE, version: '0.0.43', sha256: 'b'.repeat(64) }
  return { images, boat, release, name, poll }
}

it.each([
  {
    stage: 'normal reply',
    cutoff: false,
    status: 200,
    body: { state: 'building' },
    starts: 1,
  },
  {
    stage: 'reply cutoff',
    cutoff: true,
    status: 503,
    body: { error: { code: 'service_unavailable' } },
    starts: 0,
  },
])(
  'restarts a removed ready attempt with its saved release at the $stage',
  async (test) => {
    const { images, boat, release, poll } = await admittedReadyImage()
    await images.env.DB.prepare(
      "UPDATE software_images SET phase = 'cleanup', sandbox_id = 'old-builder' WHERE id = 'removed'",
    ).run()
    const route = boatRoute({ operation: 'delete', sandboxId: 'old-builder' })
    const fetch = images.dependencies.fetch
    const held = heldOperation()
    images.dependencies.fetch = async (request) => {
      const response = await fetch(request)
      if (
        request.method === route.method &&
        new URL(request.url).pathname.endsWith(route.path)
      )
        await held.wait()
      return response
    }
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    boat.commandRunning = true
    const pending = poll.request()
    try {
      await held.entered
      await images.env.DB.prepare(
        "DELETE FROM software_images WHERE id = 'removed'",
      ).run()
      let cutoffResponse: Response | undefined
      if (test.cutoff) {
        await vi.advanceTimersByTimeAsync(20_000)
        cutoffResponse = await pending
      }
      held.release()
      const response = cutoffResponse ?? (await pending)
      await poll.tasks.drain()
      expect(response.status).toBe(test.status)
      expect(await response.json()).toMatchObject(test.body)
      const [replacement] = await softwareImages(images.env.DB, 'boat')
      expect(replacement?.id).not.toBe('removed')
      expect(replacement?.state).toBe('building')
      expect(replacement?.version).toBe(await softwareVersion(SOFTWARE))
      expect(boat.starts).toHaveLength(test.starts)
      boat.commandRunning = false
      expect(await (await poll.request()).json()).toMatchObject({
        state: 'ready',
      })
      expect(boat.starts).toHaveLength(1)
      expect(release.reads).toBe(1)
    } finally {
      held.release()
      await pending
      await poll.tasks.drain()
    }
  },
)

it.each(['waiting snapshot', 'transient error'] as const)(
  'restarts a removed attempt instead of returning its cached state after a %s',
  async (stage) => {
    const { images, boat, release, name, poll } = await admittedReadyImage()
    await images.env.DB.prepare(
      "UPDATE software_images SET state = 'building', phase = 'snapshot', sandbox_id = 'old-builder', snapshot_recorded = 1 WHERE id = 'removed'",
    ).run()
    const route = boatRoute({ operation: 'getSnapshot', name })
    const fetch = images.dependencies.fetch
    const held = heldOperation()
    images.dependencies.fetch = async (request) => {
      if (
        request.method === route.method &&
        new URL(request.url).pathname.endsWith(route.path)
      ) {
        await held.wait()
        return stage === 'transient error'
          ? new Response(null, { status: 503 })
          : Response.json({
              ok: true,
              snapshot: {
                name,
                sourceSandboxId: 'old-builder',
                status: 'saving',
              },
            })
      }
      return fetch(request)
    }
    const pending = poll.request()
    try {
      await held.entered
      await images.env.DB.prepare(
        "DELETE FROM software_images WHERE id = 'removed'",
      ).run()
      held.release()
      expect(await (await pending).json()).toMatchObject({ state: 'ready' })
      const [replacement] = await softwareImages(images.env.DB, 'boat')
      expect(replacement?.id).not.toBe('removed')
      expect(replacement?.state).toBe('ready')
      expect(replacement?.version).toBe(await softwareVersion(SOFTWARE))
      expect(boat.starts).toHaveLength(1)
      expect(release.reads).toBe(1)
    } finally {
      held.release()
      await pending
      await poll.tasks.drain()
    }
  },
)

it('restarts admission when its chosen image disappears before the deploy association is saved', async () => {
  const { images, boat } = fixtureForTest()
  const release = softwareImageReleaseFixture(images)
  await seedReadySoftwareImage(images.env.DB, 'removed')
  const held = heldOperation()
  const db = images.env.DB
  images.env = { ...images.env, DB: holdSoftwareImageDeploy(db, held.wait) }
  const poll = await softwareImagePoll(images)
  const pending = poll.request()
  try {
    await held.entered
    await db.prepare("DELETE FROM software_images WHERE id = 'removed'").run()
    held.release()
    expect((await pending).status).toBe(200)
    expect(await (await pending).json()).toMatchObject({ state: 'ready' })
    const [replacement] = await softwareImages(db, 'boat')
    expect(replacement?.id).not.toBe('removed')
    expect(replacement?.state).toBe('ready')
    expect(boat.starts).toHaveLength(1)
    expect(release.reads).toBe(1)
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})
