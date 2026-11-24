import { afterEach, expect, it, vi } from 'vitest'

import { setupBackendTests } from '../lifecycle/backend-test-hooks'
import { boatRoute } from '../sandbox/routes'
import { heldOperation } from '../test-support/held-operation'
import { softwareImages } from './data'
import { softwareImagePoll } from './poll.test-support'
import { repairSoftwareImages } from './repair'

const fixtureForTest = setupBackendTests()
afterEach(() => vi.useRealTimers())

it('answers before a provider create deadline and recovers its saved allocation safely', async () => {
  const { images, boat } = fixtureForTest()
  const fetch = images.dependencies.fetch
  const create = boatRoute({ operation: 'create' })
  const held = heldOperation()
  const events: string[] = []
  let first = true
  images.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (
      first &&
      request.method === create.method &&
      new URL(request.url).pathname.endsWith(create.path)
    ) {
      first = false
      events.push('create')
      return new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          events.push('provider deadline')
          reject(new Error('Lost create reply at the provider deadline'))
        })
        held.release()
      })
    }
    return response
  }
  const poll = await softwareImagePoll(images)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let response: Response | undefined
  const pending = poll.request().then((value) => {
    response = value
    events.push('response')
    return value
  })
  try {
    await held.wait()
    await vi.advanceTimersByTimeAsync(20_000)
    expect([...events]).toEqual(['create', 'response'])
    expect(response?.status).toBe(200)
    expect(await response?.json()).toMatchObject({
      state: 'building',
      phase: 'allocating',
      output: '',
    })
    await vi.advanceTimersByTimeAsync(10_000)
    await poll.tasks.drain()
    expect([...events]).toEqual(['create', 'response', 'provider deadline'])
    expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
      state: 'building',
      phase: 'allocating',
      sandboxId: null,
    })
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      phase: 'done',
      output: 'installing...\n',
    })
    expect(boat.starts).toHaveLength(2)
    expect(boat.starts[1]).toEqual(boat.starts[0])
    expect(boat.deletedIds).toEqual(['bx_1'])
  } finally {
    await vi.advanceTimersByTimeAsync(30_000)
    await pending
    await poll.tasks.drain()
  }
})

it('saves a late create reply without starting another provider call after yielding', async () => {
  const { images, boat, host } = fixtureForTest()
  const held = heldOperation()
  boat.afterCreate = () => held.wait()
  const poll = await softwareImagePoll(images)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const pending = poll.request()
  try {
    await held.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await (await pending).json()).toMatchObject({
      state: 'building',
      phase: 'allocating',
    })
    held.release()
    await poll.tasks.drain()
    expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
      state: 'building',
      phase: 'software',
      sandboxId: 'bx_1',
    })
    expect(boat.sandboxReads).toEqual([])
    expect(boat.commands).toEqual([])
    expect(host.commandRequests).toEqual([])
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      phase: 'done',
      output: 'installing...\n',
    })
    expect(boat.starts).toHaveLength(1)
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})

it('keeps late command output pending so a later poll returns it once', async () => {
  const { images, boat } = fixtureForTest()
  boat.commandRunning = true
  const poll = await softwareImagePoll(images)
  expect(await (await poll.request()).json()).toMatchObject({
    output: 'installing...\n',
  })
  const held = heldOperation()
  let first = true
  boat.beforeStatus = async () => {
    if (first) {
      first = false
      await held.wait()
    }
  }
  const lateOutput = `late output\n${'😀'.repeat(40_000)}end!\n`
  boat.commandOutput += lateOutput
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
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
    expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
      stdoutOffset: 160_031,
    })
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'building',
      output: lateOutput,
    })
    expect(await (await poll.request()).json()).toMatchObject({ output: '' })
    boat.commandOutput += 'cron first\n'
    await repairSoftwareImages(images)
    boat.commandOutput += 'cron tail\n'
    boat.commandRunning = false
    await repairSoftwareImages(images)
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      output: 'cron first\ncron tail\n',
    })
    expect(await (await poll.request()).json()).toMatchObject({ output: '' })
    expect(boat.starts).toHaveLength(1)
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})

it('returns saved output before journal cleanup and bounds its long provider command', async () => {
  const { images, boat, host } = fixtureForTest()
  host.autoConnect = false
  const fetch = images.dependencies.fetch
  const held = heldOperation()
  const events: string[] = []
  let first = true
  images.dependencies.fetch = async (request) => {
    const response = await fetch(request)
    if (first && boat.commands.at(-1)?.startsWith('rm -rf --')) {
      first = false
      const waiting = held.wait()
      return new Promise<Response>((resolve, reject) => {
        request.signal.addEventListener('abort', () => {
          events.push('work deadline')
          reject(new Error('Lost journal cleanup reply'))
        })
        void waiting.then(() => response).then(resolve)
      })
    }
    return response
  }
  const poll = await softwareImagePoll(images)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  let response: Response | undefined
  const pending = poll.request().then((value) => {
    response = value
    events.push('response')
    return value
  })
  try {
    await held.entered
    await vi.advanceTimersByTimeAsync(20_000)
    expect(response?.status).toBe(200)
    expect(await response?.json()).toMatchObject({
      state: 'building',
      phase: 'journal',
      output: 'installing...\n',
    })
    await vi.advanceTimersByTimeAsync(25_000)
    expect([...events]).toEqual(['response', 'work deadline'])
    await poll.tasks.drain()
    expect((await softwareImages(images.env.DB, 'boat'))[0]).toMatchObject({
      state: 'building',
      phase: 'journal',
    })
    expect(await (await poll.request()).json()).toMatchObject({
      state: 'ready',
      phase: 'done',
      output: '',
    })
    expect(boat.starts).toHaveLength(1)
  } finally {
    held.release()
    await pending
    await poll.tasks.drain()
  }
})
