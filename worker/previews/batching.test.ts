import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { relayResponse } from './relay.test-support'
import {
  barrier,
  bodySource,
  holdFirstAccessRead,
  openPreview,
} from './stream-test-support'
import { createToolsHarness, type ToolsHarness } from './test-support'

let harness: ToolsHarness
beforeAll(async () => {
  harness = await createToolsHarness()
})
beforeEach(async () => {
  await harness.resetTools()
})
afterAll(async () => {
  await harness.dispose()
})

it('batches queued socket frames using a new authorization read after their arrival', async () => {
  const setup = await openPreview(harness)
  expect(
    (
      await setup.handler.proxy(
        setup.previewRequest(setup.previewUrl, {
          headers: { Upgrade: 'websocket' },
        }),
      )
    ).status,
  ).toBe(101)
  const started = barrier<void>()
  const release = barrier<void>()
  let reads = 0
  const database = harness.env.DB
  const prepare = database.prepare.bind(database)
  const wrap = (statement: D1PreparedStatement): D1PreparedStatement =>
    new Proxy(statement, {
      get(target, name) {
        if (name === 'bind')
          return (...values: unknown[]) => wrap(target.bind(...values))
        if (name !== 'all') return Reflect.get(target, name)
        return async () => {
          const result = await target.all()
          reads++
          if (reads === 1) {
            started.resolve()
            await release.promise
          }
          return result
        }
      },
    })
  const observedPrepare = (query: string) => {
    const statement = prepare(query)
    return query.includes('WITH requested') ? wrap(statement) : statement
  }
  harness.env.DB = new Proxy(database, {
    get(target, name) {
      return name === 'prepare' ? observedPrepare : Reflect.get(target, name)
    },
  })
  const upstream = harness.upstreamSockets[0]
  const browser = harness.serverSockets[0]
  const sent = browser.whenSent(3)
  upstream.emit('first')
  await started.promise
  upstream.emit('second')
  upstream.emit('third')
  expect(browser.sent).toEqual([])
  release.resolve()
  await sent
  expect(browser.sent).toEqual(['first', 'second', 'third'])
  expect(reads).toBe(2)
  harness.env.DB = database
  browser.close()
})

it('passes response data that arrives during a check in one later batch after a new read', async () => {
  const setup = await openPreview(harness)
  const source = bodySource()
  const base = harness.dependencies.fetch
  harness.dependencies.fetch = async (request) =>
    new URL(request.url).hostname === 'boat.dev'
      ? base(request)
      : relayResponse(source.stream)
  const response = await setup.handler.proxy(
    setup.previewRequest(setup.previewUrl),
  )
  const access = holdFirstAccessRead(harness)
  try {
    const reader = response.body?.getReader()
    const requested = source.nextPull()
    const first = reader?.read()
    await requested
    source.send('first')
    await access.started
    source.send('second')
    source.send('third')
    access.release()
    const text = new TextDecoder()
    expect(text.decode((await first)?.value)).toBe('first')
    expect(text.decode((await reader?.read())?.value)).toBe('secondthird')
    expect(access.reads).toBe(2)
    await reader?.cancel()
  } finally {
    access.restore()
  }
})

it('drains buffered socket data before forwarding the peer close code and reason', async () => {
  const setup = await openPreview(harness)
  for (const [index, closing] of [
    { code: 4001, reason: 'finished', forwarded: 4001, browser: false },
    { code: 1005, reason: '', forwarded: 1000, browser: true },
    { code: 1006, reason: 'connection lost', forwarded: 1011, browser: false },
  ].entries()) {
    await setup.handler.proxy(
      setup.previewRequest(setup.previewUrl, {
        headers: { Upgrade: 'websocket' },
      }),
    )
    const started = barrier<void>()
    const release = barrier<void>()
    const database = harness.env.DB
    const prepare = database.prepare.bind(database)
    const wrap = (statement: D1PreparedStatement): D1PreparedStatement =>
      new Proxy(statement, {
        get(target, name) {
          if (name === 'bind')
            return (...values: unknown[]) => wrap(target.bind(...values))
          if (name !== 'all') return Reflect.get(target, name)
          return async () => {
            const result = await target.all()
            started.resolve()
            await release.promise
            return result
          }
        },
      })
    harness.env.DB = new Proxy(database, {
      get(target, name) {
        return name === 'prepare'
          ? (query: string) =>
              query.includes('WITH requested')
                ? wrap(prepare(query))
                : prepare(query)
          : Reflect.get(target, name)
      },
    })
    const upstream = harness.upstreamSockets[index]
    const browser = harness.serverSockets[index]
    const source = closing.browser ? browser : upstream
    const destination = closing.browser ? upstream : browser
    source.emit('final output')
    await started.promise
    source.close(closing.code, closing.reason)
    destination.emit('input after peer close')
    const beforeDrain = destination.closed
    release.resolve()
    await destination.end
    expect(beforeDrain).toBe(null)
    expect(destination.sent).toEqual(['final output'])
    expect(destination.closed).toEqual({
      code: closing.forwarded,
      reason: closing.reason,
    })
    expect(source.sent).toEqual([])
    harness.env.DB = database
  }
})
