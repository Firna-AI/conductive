import { expect, it } from 'vitest'

import { terminalPaths, type TerminalResponse } from '../../src/shared/terminal'
import { barrier } from '../previews/stream-test-support'
import { setupTerminalSocketTests } from './socket.test-support'

const fixture = setupTerminalSocketTests()

it('opens each listed shell with only its stored ID and trusted ttyd headers', async () => {
  const setup = await fixture()
  const second = await setup.create()
  for (const [id, query] of [
    ['workspace', ''],
    [second.id, `?arg=${second.id}`],
  ]) {
    const response = await setup.socket(
      `${setup.socketPath(id)}?arg=workspace&arg=%3Bsh&other=private`,
    )
    expect(response.status).toBe(101)
    expect(response.headers.get('Sec-WebSocket-Protocol')).toBe('tty')
    const upstream = setup.harness.requests.at(-1)!
    expect(upstream.url).toBe(`https://sandbox-7681.on.boat.dev/ws${query}`)
    expect(Object.fromEntries(upstream.headers)).toEqual({
      authorization: `Basic ${btoa(`conductive:${'a'.repeat(64)}`)}`,
      cookie: '_port_auth=server-port-token',
      origin: 'https://sandbox-7681.on.boat.dev',
      'sec-websocket-protocol': 'tty',
      upgrade: 'websocket',
    })
    await setup.disconnect()
  }
})

it('refuses closed, unknown, and invalid terminal IDs before contacting the sandbox', async () => {
  const setup = await fixture()
  const second = await setup.create()
  expect((await setup.close(second.id)).status).toBe(200)
  setup.harness.requests.length = 0
  for (const id of [
    second.id,
    'f'.repeat(32),
    'INVALID',
    'workspace/other',
    '%',
  ]) {
    const response = await setup.socket(setup.socketPath(id))
    expect(response.status, id).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'terminal_not_found' },
    })
  }
  expect(setup.harness.requests).toEqual([])
})

it('refuses new sockets during a close and permits reconnect after the close fails', async () => {
  const setup = await fixture()
  const second = await setup.create()
  expect((await setup.socket(setup.socketPath('workspace'))).status).toBe(101)
  const browser = setup.harness.serverSockets[0]
  const upstream = setup.harness.upstreamSockets[0]
  const entered = barrier<void>()
  const release = barrier<void>()
  const original = setup.harness.dependencies.fetch
  setup.harness.dependencies.fetch = async (request) => {
    if (new URL(request.url).pathname.endsWith('/commands')) {
      entered.resolve()
      await release.promise
      return Response.json({
        ok: true,
        type: 'command.finished',
        exitCode: 1,
        stdout: '',
        stderr: 'failed',
        timedOut: false,
      })
    }
    return original(request)
  }
  const closing = setup.close('workspace')
  await entered.promise
  try {
    expect(browser.closed?.code).toBe(1008)
    expect(upstream.closed?.code).toBe(1008)
    browser.emit('{"columns":80,"rows":24}')
    expect(upstream.sent).toEqual([])
    const before = setup.harness.requests.length
    for (const path of [
      setup.socketPath('workspace'),
      terminalPaths.socket(setup.orgId, setup.workspaceId),
    ]) {
      const response = await setup.socket(path)
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({
        error: { code: 'terminal_not_found' },
      })
    }
    expect(setup.harness.requests).toHaveLength(before)
    expect((await setup.socket(second.socketPath)).status).toBe(101)
    await setup.disconnect()
  } finally {
    release.resolve()
  }
  expect((await closing).status).toBe(502)
  expect((await setup.socket(setup.socketPath('workspace'))).status).toBe(101)
  await setup.disconnect()
})

it.each(['closing', 'removed'] as const)(
  'cancels a pending upstream socket when its terminal is %s before the upgrade returns',
  async (phase) => {
    const setup = await fixture()
    await setup.create()
    const entered = barrier<void>()
    const release = barrier<void>()
    const commandEntered = barrier<void>()
    const commandRelease = barrier<void>()
    const original = setup.harness.dependencies.fetch
    setup.harness.dependencies.fetch = async (request) => {
      const response = await original(request)
      if (request.headers.get('Upgrade') === 'websocket') {
        entered.resolve()
        await release.promise
      }
      if (new URL(request.url).pathname.endsWith('/commands')) {
        commandEntered.resolve()
        await commandRelease.promise
      }
      return response
    }
    const opening = setup.socket(setup.socketPath('workspace'))
    await entered.promise
    const closing = setup.close('workspace')
    await commandEntered.promise
    try {
      if (phase === 'removed') {
        commandRelease.resolve()
        expect((await closing).status).toBe(200)
      }
      release.resolve()
      const response = await opening
      expect(response.status).toBe(404)
      expect(await response.json()).toMatchObject({
        error: { code: 'terminal_not_found' },
      })
      expect(setup.harness.upstreamSockets[0].closed?.code).toBe(1008)
      expect(setup.harness.upstreamSockets[0].sent).toEqual([])
      expect(setup.harness.serverSockets).toEqual([])
    } finally {
      release.resolve()
      commandRelease.resolve()
    }
    expect((await closing).status).toBe(200)
  },
)

it('keeps the legacy socket on the first sorted terminal after Terminal 1 closes', async () => {
  const setup = await fixture()
  const second = await setup.create()
  const legacy = terminalPaths.socket(setup.orgId, setup.workspaceId)
  expect((await setup.socket(legacy)).status).toBe(101)
  expect(setup.harness.requests.at(-1)!.url).toBe(
    'https://sandbox-7681.on.boat.dev/ws',
  )
  await setup.disconnect()
  expect((await setup.close('workspace')).status).toBe(200)
  const statePath = terminalPaths.connection(setup.orgId, setup.workspaceId)
  const state: TerminalResponse = await (await setup.fetch(statePath)).json()
  expect(state).toMatchObject({
    state: 'ready',
    socketPath: legacy,
    terminals: [second],
  })
  expect((await setup.socket(state.socketPath!)).status).toBe(101)
  expect(setup.harness.requests.at(-1)!.url).toBe(
    `https://sandbox-7681.on.boat.dev/ws?arg=${second.id}`,
  )
  await setup.disconnect()
  const replacement = await setup.create()
  expect(replacement.number).toBe(1)
  expect((await setup.socket(legacy)).status).toBe(101)
  expect(setup.harness.requests.at(-1)!.url).toBe(
    `https://sandbox-7681.on.boat.dev/ws?arg=${replacement.id}`,
  )
  await setup.disconnect()
})

it('opens Terminal 1 without URL arguments on older software and refuses a second terminal', async () => {
  const setup = await fixture(false)
  const state = await setup.fetch(
    terminalPaths.connection(setup.orgId, setup.workspaceId),
  )
  expect(await state.json()).toMatchObject({
    several: false,
    terminals: [{ id: 'workspace', number: 1 }],
  })
  const create = await setup.fetch(
    terminalPaths.terminals(setup.orgId, setup.workspaceId),
    'POST',
  )
  expect(create.status).toBe(409)
  expect(await create.json()).toMatchObject({
    error: { code: 'terminals_unavailable' },
  })
  expect((await setup.socket(setup.socketPath('workspace'))).status).toBe(101)
  expect(setup.harness.requests.at(-1)!.url).toBe(
    'https://sandbox-7681.on.boat.dev/ws',
  )
  await setup.disconnect()
})
