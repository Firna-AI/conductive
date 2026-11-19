import { afterEach, expect, it, vi } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { heldOperation } from '../test-support/held-operation'
import { softwareImages } from './data'
import { holdSoftwareImageRead, softwareImagePoll } from './poll.test-support'

const fixtureForTest = setupBackendTests()
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it.each([
  { stage: 'release', states: [], warnings: ['software_image_repair_failed'] },
  { stage: 'admission', states: ['building'], warnings: [] },
])('bounds a held $stage before any saved checkpoint', async (test) => {
  const { images, boat } = fixtureForTest()
  const held = heldOperation()
  const fetch = images.dependencies.fetch
  let first = true
  if (test.stage === 'release') {
    images.dependencies.fetch = async (request) => {
      if (first) {
        first = false
        await held.wait()
        return new Response(null, { status: 503 })
      }
      return fetch(request)
    }
  } else {
    images.env = {
      ...images.env,
      DB: holdSoftwareImageRead(images.env.DB, held.wait),
    }
  }
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const poll = await softwareImagePoll(images)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let response: Response | undefined
  const pending = poll.request().then((value) => {
    response = value
    return value
  })
  try {
    await held.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect(response?.status).toBe(503)
    expect(await response?.json()).toEqual({
      error: {
        code: 'service_unavailable',
        message: 'The app is not available. Try again.',
      },
    })
    expect(boat.starts).toEqual([])
    held.release()
    await poll.tasks.drain()
    expect(
      (await softwareImages(images.env.DB, 'boat')).map((image) => image.state),
    ).toEqual(test.states)
    expect(warning.mock.calls.map(([fields]) => fields.kind)).toEqual(
      test.warnings,
    )
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      phase: 'done',
      output: 'installing...\n',
    })
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})
