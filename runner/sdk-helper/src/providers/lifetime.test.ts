import { spawn } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeChild } from '../../../test-support/child'
import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { engineFixture } from '../../../test-support/engine'
import { turn } from '../../../test-support/harness'
import { deferred, stop } from '../../../test-support/runtime'
import { createClaudeFactory, type ClaudeQueryFactory } from './claude'
import { createCodexFactory } from './codex'

beforeEach(mockComputerServer)

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}))

async function fixture(child: FakeChild) {
  vi.mocked(spawn).mockReturnValue(child)
  const directory = await mkdtemp(join(tmpdir(), 'conductive-lifetime-'))
  const sdk = new FakeClaudeQuery()
  const start: ClaudeQueryFactory = (parameters) => {
    const options = {
      command: '/fake/claude',
      args: [],
      cwd: directory,
      env: {},
      signal: new AbortController().signal,
    }
    if (parameters.options?.spawnClaudeCodeProcess)
      parameters.options.spawnClaudeCodeProcess(options)
    else spawn(options.command, options.args)
    return sdk.open(parameters)
  }
  const h = await engineFixture({
    home: directory,
    providers: {
      claude: createClaudeFactory(start, () => '/fake/claude'),
      codex: createCodexFactory(),
    },
  })
  onTestFinished(async () => {
    try {
      await h.engine.close()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  return { ...h, sdk }
}

it('holds a Claude turn end until its child exits', async () => {
  const child = new FakeChild()
  const h = await fixture(child)
  await h.engine.command(turn())
  const credentials = join(
    h.options.home,
    '.conductive',
    'anthropic',
    'credentials',
  )
  const profiles = await readdir(credentials)
  expect(profiles).toHaveLength(1)
  const user = await h.sdk.nextUser()
  const requested = deferred<void>()
  child.onKill = () => requested.resolve()
  await h.sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    user_message_uuids: [user.uuid],
  })
  const ending = h.engine.idle()
  try {
    await Promise.race([requested.promise, ending])
    expect(h.events.map((event) => event.type)).toEqual(['turn.started'])
    expect(child.signals).toEqual(['SIGTERM'])
    expect(await readdir(credentials)).toEqual(profiles)
  } finally {
    child.exit()
    await ending
  }
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
  expect(await readdir(credentials)).toEqual([])
})

it('kills a stuck process at the approved limit and then ends its turn', async () => {
  const child = new FakeChild()
  child.rpc = true
  child.exitOnSignal = 'SIGKILL'
  const h = await fixture(child)
  await h.engine.command(turn('1', 'alice', 'codex'))
  const requested = deferred<void>()
  child.onKill = () => requested.resolve()
  vi.useFakeTimers()
  const ending = h.engine.command(stop('session-1', 'turn-1'))
  try {
    await requested.promise
    await vi.advanceTimersByTimeAsync(4_999)
    expect(child.signals).toEqual(['SIGTERM'])
    expect(h.events.map((event) => event.type)).toEqual(['turn.started'])
    await vi.advanceTimersByTimeAsync(1)
    expect(child.signals).toEqual(['SIGTERM', 'SIGKILL'])
    await ending
    expect(h.events.at(-1)).toMatchObject({
      type: 'turn.completed',
      state: 'stopped',
    })
  } finally {
    child.exit()
    await ending
    vi.useRealTimers()
  }
})

it('keeps a canceled start open until its created child exits', async () => {
  const child = new FakeChild()
  child.rpc = true
  child.holdMethod = 'initialize'
  const entered = deferred<void>()
  child.onRequest = (method) => {
    if (method === 'initialize') entered.resolve()
  }
  const h = await fixture(child)
  const starting = h.engine.command(turn('1', 'alice', 'codex'))
  await entered.promise
  const requested = deferred<void>()
  child.onKill = () => requested.resolve()
  const closedAtEnd: (number | null)[] = []
  const emit = h.options.emit
  vi.spyOn(h.options, 'emit').mockImplementation(async (event) => {
    if (event.type === 'turn.completed' || event.type === 'turn.failed')
      closedAtEnd.push(child.exitCode)
    await emit(event)
  })
  vi.useFakeTimers()
  const ending = h.engine.command(stop('session-1', 'turn-1'))
  try {
    await requested.promise
    await vi.advanceTimersByTimeAsync(0)
    expect(closedAtEnd).toEqual([])
    expect(h.events.map((event) => event.type)).toEqual(['turn.started'])
  } finally {
    child.exit()
    await Promise.all([starting, ending])
    vi.useRealTimers()
  }
  expect(closedAtEnd).toEqual([0])
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    state: 'stopped',
    userMessageIds: ['message-1'],
  })
})
