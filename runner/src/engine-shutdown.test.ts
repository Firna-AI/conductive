import { expect, it, vi } from 'vitest'
import type { ChangedFile } from '../../src/shared/generated/ChangedFile'
import { engineFixture } from '../test-support/engine'
import { turn } from '../test-support/harness'
import { FakeProvider } from '../test-support/providers'
import { deferred, sessionTurn, stop } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import type {
  ProviderOptions,
  ProviderProcess,
} from '../sdk-helper/src/providers/types'

const files: ChangedFile[] = [
  { path: 'changed.txt', change: 'modified', added: 1, removed: 0 },
]

it('ends a running turn with its changed files before closing the runner connection', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.confirmEvents = false
  h.endpoint.send(turn())
  await h.runner.idle()
  h.setTurnFiles(files)
  const provider = h.providers.latest
  await h.runner.close()
  await h.runner.close()
  expect(provider.closed).toBe(true)
  expect(
    h.endpoint.runnerEvents
      .filter(({ event }) => event.type === 'turn.completed')
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'stopped',
      durationMs: 0,
      files,
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
  expect(
    h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
  ).toEqual([5])
  expect(h.warnings).toEqual([])
})

it('ends shutdown during a held start and closes the late provider without sending input', async () => {
  const entered = deferred<ProviderOptions>()
  const gate = deferred<ProviderProcess>()
  const disposed = deferred<void>()
  const h = await engineFixture({
    providers: {
      claude: async (options) => {
        entered.resolve(options)
        return gate.promise
      },
      codex: async () => {
        throw new Error('Unexpected Codex start.')
      },
    },
  })
  const starting = h.engine.command(sessionTurn('starting'))
  const options = await entered.promise
  const late = new FakeProvider(options)
  vi.spyOn(late, 'close').mockImplementation(async () => {
    late.closed = true
    disposed.resolve()
  })
  try {
    await h.engine.close()
    await starting
    expect(options.signal?.aborted).toBe(true)
    expect(h.events.map((event) => event.type)).toEqual([
      'turn.started',
      'turn.completed',
    ])
    expect(h.events.at(-1)).toMatchObject({ state: 'stopped', files: [] })
    gate.resolve(late)
    await disposed.promise
    expect(late.messages).toEqual([])
    expect(late.closed).toBe(true)
    await h.engine.command(stop('starting'))
    await h.engine.command(sessionTurn('late'))
    expect(h.events).toHaveLength(2)
    expect(h.warnings).toEqual([])
  } finally {
    gate.resolve(late)
    await starting
  }
})

it('ends once with changed files when shutdown crosses a result scan and Stop', async () => {
  for (const stopFirst of [false, true]) {
    const entered = deferred<AbortSignal>()
    const release = deferred<readonly ChangedFile[]>()
    let first = true
    const h = await engineFixture({
      changedSince: async (_before, signal) => {
        if (first) {
          first = false
          entered.resolve(signal)
          return release.promise
        }
        return files
      },
    })
    await h.engine.command(sessionTurn('crossing'))
    const provider = h.providers.latest
    provider.emit({ type: 'result', state: 'finished', userMessageIds: [] })
    const signal = await entered.promise
    try {
      const stopped = stopFirst ? h.engine.command(stop('crossing')) : undefined
      const closing = h.engine.close()
      const crossing = h.engine.command(
        stop('crossing', 'turn-crossing', 'again'),
      )
      provider.emit({ type: 'failed', code: 'late', message: 'Late failure.' })
      provider.emit({ type: 'result', state: 'finished', userMessageIds: [] })
      await Promise.all([stopped, closing, crossing])
      expect(signal.aborted).toBe(true)
      expect(provider.closed).toBe(true)
      expect(h.events.map((event) => event.type)).toEqual([
        'turn.started',
        'turn.completed',
      ])
      expect(h.events.at(-1)).toMatchObject({ state: 'stopped', files })
      expect(h.warnings).toEqual([])
    } finally {
      release.resolve(files)
      await h.engine.idle()
    }
  }
})
