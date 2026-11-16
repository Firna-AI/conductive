import { expect, it } from 'vitest'

import { createTerminalConnector } from '../app/terminal-transport'
import type { WorkspaceSocketMessage } from '../shared/events'
import {
  terminalPaths,
  type CreateTerminalResponse,
  type TerminalResponse,
} from '../shared/terminal'
import { FakeApiServer } from './fake-api'
import { FAKE_IDS } from './fixtures/core'

const statePath = terminalPaths.connection(FAKE_IDS.org, FAKE_IDS.workspace)
const listPath = terminalPaths.terminals(FAKE_IDS.org, FAKE_IDS.workspace)
const entryPath = (id: string) =>
  terminalPaths.terminal(FAKE_IDS.org, FAKE_IDS.workspace, id)
const socketPath = (id: string) =>
  terminalPaths.terminalSocket(FAKE_IDS.org, FAKE_IDS.workspace, id)
const first = {
  id: 'workspace',
  number: 1,
  socketPath: socketPath('workspace'),
}

async function create(server: FakeApiServer) {
  const response = await server.fetch(listPath, { method: 'POST', body: '{}' })
  expect(response.status).toBe(201)
  const body: CreateTerminalResponse = await response.json()
  return body.terminal
}

const socket = (server: FakeApiServer, path: string) =>
  server.fetch(path, {
    headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tty' },
  })

it('keeps terminal writes in later reads and publishes full lists to each subscriber', async () => {
  const server = new FakeApiServer()
  const through = server.events.history().throughEventNumber
  const tabs: WorkspaceSocketMessage[][] = [[], []]
  const stops = tabs.map((tab) =>
    server.events.subscribe(through, (message) => tab.push(message)),
  )
  const initial: TerminalResponse = await (await server.fetch(statePath)).json()
  expect(initial).toEqual({
    state: 'ready',
    protocol: 'tty',
    socketPath: terminalPaths.socket(FAKE_IDS.org, FAKE_IDS.workspace),
    several: true,
    terminals: [first],
  })
  const second = await create(server)
  expect(second).toMatchObject({
    number: 2,
    id: expect.stringMatching(/^[a-f0-9]{32}$/),
  })
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [first, second],
  })
  const closed = await server.fetch(entryPath(second.id), { method: 'DELETE' })
  expect(closed.status).toBe(200)
  expect(await closed.json()).toEqual({ terminals: [first] })
  const refused = await server.fetch(entryPath('workspace'), {
    method: 'DELETE',
  })
  expect(refused.status).toBe(409)
  expect(await refused.json()).toMatchObject({
    error: { code: 'terminal_last' },
  })
  for (const tab of tabs)
    expect(tab).toEqual([
      { type: 'history', history: { events: [], throughEventNumber: through } },
      {
        type: 'event',
        envelope: expect.objectContaining({
          workspaceId: FAKE_IDS.workspace,
          eventNumber: through + 1,
          event: { type: 'terminals.updated', terminals: [first, second] },
        }),
      },
      {
        type: 'event',
        envelope: expect.objectContaining({
          workspaceId: FAKE_IDS.workspace,
          eventNumber: through + 2,
          event: { type: 'terminals.updated', terminals: [first] },
        }),
      },
    ])
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [first],
  })
  stops.forEach((stop) => stop())
})

it('reuses the lowest free terminal number and refuses an eleventh terminal without an event', async () => {
  const server = new FakeApiServer()
  const second = await create(server)
  const third = await create(server)
  await server.fetch(entryPath(second.id), { method: 'DELETE' })
  const replacement = await create(server)
  expect(replacement.number).toBe(2)
  expect(replacement.id).not.toBe(second.id)
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [first, replacement, third],
  })
  for (let count = 4; count <= 10; count++) await create(server)
  const through = server.events.history().throughEventNumber
  const limited = await server.fetch(listPath, { method: 'POST', body: '{}' })
  expect(limited.status).toBe(409)
  expect(await limited.json()).toMatchObject({
    error: { code: 'terminal_limit' },
  })
  expect(server.events.history(through)).toEqual({
    events: [],
    throughEventNumber: through,
  })
})

it('joins separate fake shells through the app codec and closes only the selected shell viewers', async () => {
  const server = new FakeApiServer()
  const second = await create(server)
  const connect = createTerminalConnector(server.terminals.open)
  const connections = [first, first, second].map((entry) => {
    const transport = connect({
      state: 'ready',
      protocol: 'tty',
      socketPath: entry.socketPath,
    })
    const output: string[] = []
    let closed = 0
    transport.onClose(() => closed++)
    const ready = new Promise<void>((resolve) =>
      transport.onData((data) => {
        output.push(data)
        resolve()
      }),
    )
    transport.resize(80, 24)
    return { transport, output, ready, closed: () => closed }
  })
  await Promise.all(connections.map(({ ready }) => ready))
  connections[0].transport.write('first\r')
  connections[2].transport.write('second\r')
  const sockets = server.terminals.sockets
  expect(sockets[0].terminal.inputs).toEqual(['first\r'])
  expect(sockets[1].terminal.inputs).toEqual(['first\r'])
  expect(sockets[2].terminal.inputs).toEqual(['second\r'])
  connections.forEach(({ output }) => {
    output.length = 0
  })
  connections[0].transport.close()
  sockets[1].terminal.emit('live output')
  expect(connections.map(({ output }) => output)).toEqual([
    [],
    ['live output'],
    [],
  ])
  expect(
    (await server.fetch(entryPath('workspace'), { method: 'DELETE' })).status,
  ).toBe(200)
  expect(connections.map(({ closed }) => closed())).toEqual([1, 1, 0])
  const legacy = await socket(
    server,
    terminalPaths.socket(FAKE_IDS.org, FAKE_IDS.workspace),
  )
  expect(legacy.status).toBe(101)
  expect(server.terminals.sockets.at(-1)?.terminalId).toBe(second.id)
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [second],
  })
  server.terminals.sockets.at(-1)?.close()
  connections[2].transport.close()
})

it('refuses unknown, invalid, and closed fake sockets and still accepts explicit reply overrides', async () => {
  const server = new FakeApiServer()
  const second = await create(server)
  expect(
    (await socket(server, `${second.socketPath}?arg=workspace`)).status,
  ).toBe(101)
  expect(server.terminals.sockets[0].terminalId).toBe(second.id)
  await server.fetch(entryPath(second.id), { method: 'DELETE' })
  for (const id of [
    second.id,
    'f'.repeat(32),
    'INVALID',
    'workspace/other',
    '%',
  ]) {
    const response = await socket(server, socketPath(id))
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'terminal_not_found' },
    })
  }
  expect(server.terminals.sockets).toHaveLength(1)
  const protocol = await server.fetch(socketPath('workspace'))
  expect(protocol.status).toBe(400)
  expect(await protocol.json()).toMatchObject({
    error: { code: 'terminal_protocol' },
  })
  server.json('POST', listPath, { error: { code: 'injected_failure' } }, 503)
  expect((await server.fetch(listPath, { method: 'POST' })).status).toBe(503)
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [first],
  })
})

it('serves older software with one working terminal and refuses writes while the workspace is stopped', async () => {
  const server = new FakeApiServer({ terminalSeveral: false })
  expect(await (await server.fetch(statePath)).json()).toMatchObject({
    terminals: [first],
    several: false,
  })
  const unavailable = await server.fetch(listPath, { method: 'POST' })
  expect(unavailable.status).toBe(409)
  expect(await unavailable.json()).toMatchObject({
    error: { code: 'terminals_unavailable' },
  })
  expect((await socket(server, first.socketPath)).status).toBe(101)
  server.terminals.sockets[0].close()
  const stopped = new FakeApiServer({ workspaceState: 'stopped' })
  expect(await (await stopped.fetch(statePath)).json()).toMatchObject({
    state: 'stopped',
    socketPath: null,
    terminals: [first],
  })
  for (const response of [
    await stopped.fetch(listPath, { method: 'POST' }),
    await socket(stopped, first.socketPath),
  ]) {
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: 'sandbox_not_ready' },
    })
  }
})
