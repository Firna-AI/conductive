import { afterEach, expect, it, vi } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { boatRoute } from '../sandbox/routes'
import { heldOperation } from '../test-support/held-operation'
import { softwareImages } from './data'
import { softwareImagePoll } from './poll.test-support'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.useRealTimers())

it('resumes slow successful prerequisites and returns late ended output on the next poll', async () => {
  const { images, boat, host } = fixtureForTest()
  const fetch = images.dependencies.fetch
  const operations = [
    boatRoute({ operation: 'get', sandboxId: 'bx_1' }),
    boatRoute({ operation: 'update', sandboxId: 'bx_1' }),
  ]
  const calls = [0, 0, 0, 0]
  let held = heldOperation()
  images.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    const index = operations.findIndex(
      (operation) =>
        operation.method === request.method &&
        new URL(request.url).pathname.endsWith(operation.path.split('?')[0]),
    )
    if (index >= 0) {
      calls[index]++
      await held.wait()
    }
    return response
  }
  boat.beforeCommand = async (_command, detached) => {
    if (detached) {
      calls[2]++
      await held.wait()
    }
  }
  boat.beforeStatus = async () => {
    calls[3]++
    await held.wait()
  }
  const poll = await softwareImagePoll(images)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const expectedCalls = [
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [1, 1, 1, 0],
    [2, 1, 1, 0],
    [2, 2, 1, 0],
    [2, 2, 1, 1],
  ]
  for (const expected of expectedCalls) {
    held = heldOperation()
    const pending = poll.request()
    try {
      await held.entered
      await vi.advanceTimersByTimeAsync(20_000)
      expect(await (await pending).json()).toMatchObject({
        state: 'building',
        phase: 'software',
        output: '',
      })
      held.release()
      await poll.tasks.drain()
      expect([...calls]).toEqual(expected)
    } finally {
      held.release()
      await pending
      await poll.tasks.drain()
    }
  }
  images.dependencies.fetch = fetch
  const [image] = await softwareImages(images.env.DB, 'boat')
  expect(image).toMatchObject({
    phase: 'journal',
    processId: 1,
    commandRoute: 'host',
  })
  expect(host.statusRequests).toEqual([
    { processId: 1, stdoutOffset: 0, stderrOffset: 0 },
  ])
  expect(boat.commandRequests).toEqual(host.commandRequests)
  expect(boat.statusRequests).toEqual(host.statusRequests)
  expect(await (await poll.request()).json()).toMatchObject({
    state: 'ready',
    phase: 'done',
    output: 'installing...\n',
  })
  expect(await (await poll.request()).json()).toMatchObject({ output: '' })
  expect(boat.starts).toHaveLength(1)
})

it('resumes a slow missing snapshot lookup at its saved create intent', async () => {
  const { images, boat } = fixtureForTest()
  const fetch = images.dependencies.fetch
  const save = boatRoute({ operation: 'saveSnapshot' })
  let first = true
  images.dependencies.fetch = (request) => {
    if (
      first &&
      request.method === save.method &&
      new URL(request.url).pathname.endsWith(save.path)
    ) {
      first = false
      return Promise.resolve(new Response(null, { status: 503 }))
    }
    return fetch(request)
  }
  const poll = await softwareImagePoll(images)
  expect(await (await poll.request()).json()).toMatchObject({
    state: 'building',
    phase: 'snapshot',
  })
  const [image] = await softwareImages(images.env.DB, 'boat')
  const lookup = boatRoute({
    operation: 'getSnapshot',
    name: image.snapshotName,
  })
  const held = heldOperation()
  let lookups = 0
  images.dependencies.fetch = async (request) => {
    if (
      request.method === lookup.method &&
      new URL(request.url).pathname.endsWith(lookup.path)
    ) {
      lookups++
      await held.wait()
      return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
    }
    return fetch(request)
  }
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const pending = poll.request()
  try {
    await held.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await (await pending).json()).toMatchObject({
      state: 'building',
      phase: 'snapshot',
    })
    held.release()
    await poll.tasks.drain()
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      phase: 'done',
    })
    expect(lookups).toBe(1)
    expect(boat.deletedSnapshots).toEqual([])
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})

it('reuses admission across slow release reads and an earlier deploy digest', async () => {
  const { images, boat } = fixtureForTest()
  boat.commandRunning = true
  const original = await softwareImagePoll(images, 'earlier-deploy-token')
  expect(await (await original.request()).json()).toMatchObject({
    state: 'building',
    phase: 'software',
  })
  const fetch = images.dependencies.fetch
  let releaseReads = 0
  let held = heldOperation()
  images.dependencies.fetch = async (request) => {
    if (new URL(request.url).hostname !== 'boat.dev') {
      releaseReads++
      await held.wait()
    }
    return fetch(request)
  }
  const next = await softwareImagePoll(images, 'next-deploy-token')
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const pending = next.request()
  try {
    await held.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect((await pending).status).toBe(503)
    held.release()
    await next.tasks.drain()
    held = heldOperation()
    let response: Response | undefined
    const resumed = next.request().then((value) => {
      response = value
      return value
    })
    await Promise.race([resumed, held.entered])
    await vi.advanceTimersByTimeAsync(20_000)
    expect(response?.status).toBe(200)
    expect(await response?.json()).toMatchObject({
      state: 'building',
      phase: 'software',
    })
    held.release()
    await resumed
    await next.tasks.drain()
    boat.commandExitCode = 1
    boat.commandRunning = false
    expect(await (await next.request()).json()).toMatchObject({
      state: 'failed',
    })
    boat.commandExitCode = 0
    expect(await (await next.request()).json()).toMatchObject({
      state: 'ready',
    })
    expect(await (await next.request()).json()).toMatchObject({
      state: 'ready',
    })
    const ready = await softwareImagePoll(images, 'ready-deploy-token')
    held = heldOperation()
    const firstReady = ready.request()
    try {
      await held.entered
      await vi.advanceTimersByTimeAsync(20_000)
      expect((await firstReady).status).toBe(503)
      held.release()
      await ready.tasks.drain()
      held = heldOperation()
      let readyResponse: Response | undefined
      const reused = ready.request().then((value) => {
        readyResponse = value
        return value
      })
      await Promise.race([reused, held.entered])
      await vi.advanceTimersByTimeAsync(20_000)
      expect(readyResponse?.status).toBe(200)
      expect(await readyResponse?.json()).toMatchObject({ state: 'ready' })
      held.release()
      await reused
      await ready.tasks.drain()
    } finally {
      held.release()
      await firstReady
      await ready.tasks.drain()
    }
    expect(releaseReads).toBe(2)
    expect(boat.starts).toHaveLength(2)
  } finally {
    held.release()
    await pending
    await next.tasks.drain()
  }
})
