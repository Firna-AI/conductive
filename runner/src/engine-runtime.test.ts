import { expect, it, vi } from 'vitest'
import type { ChangedFile } from '../../src/shared/generated/ChangedFile'
import { engineFixture } from '../test-support/engine'
import { FakeProvider } from '../test-support/providers'
import { deferred, sessionTurn, stop } from '../test-support/runtime'
import type { Checkpoint } from './checkpoint'
import type { ProviderOptions, ProviderProcess } from './providers/types'

it('keeps another session live while one provider start waits and disposes a canceled late provider', async () => {
  const entered = deferred<ProviderOptions>()
  const gate = deferred<ProviderProcess>()
  const disposed = deferred<void>()
  const providers: FakeProvider[] = []
  let first = true
  const h = await engineFixture({
    providers: {
      claude: async (options) => {
        if (first) {
          first = false
          entered.resolve(options)
          return gate.promise
        }
        const provider = new FakeProvider(options)
        providers.push(provider)
        return provider
      },
      codex: async () => {
        throw new Error('Unexpected Codex start.')
      },
    },
  })
  const starting = h.engine.command(sessionTurn('A'))
  const options = await entered.promise
  const late = new FakeProvider(options)
  vi.spyOn(late, 'close').mockImplementation(async () => {
    late.closed = true
    disposed.resolve()
  })
  try {
    expect(options.signal).toBeInstanceOf(AbortSignal)
    await h.engine.command(sessionTurn('B'))
    const other = providers[0]
    if (!other) throw new Error('Session B did not start.')
    other.emit({
      type: 'delta',
      messageId: 'B-answer',
      text: 'Session B is live.',
    })
    await h.engine.command(stop('B'))
    expect(
      h.events
        .filter((event) => event.sessionId === 'B')
        .map((event) => event.type),
    ).toEqual(['turn.started', 'assistant.delta', 'turn.completed'])
    expect(late.closed).toBe(false)
    const stopping = h.engine.command(stop('A'))
    const duplicate = h.engine.command(stop('A', 'turn-A', 'second'))
    await Promise.all([starting, stopping, duplicate])
    expect(options.signal?.aborted).toBe(true)
    expect(
      h.events
        .filter((event) => event.sessionId === 'A')
        .map((event) => event.type),
    ).toEqual(['turn.started', 'turn.completed'])
    options.event({ type: 'conversation', id: 'stale-conversation' })
    options.event({
      type: 'answer',
      messageId: 'late',
      text: 'Stale startup.',
      userMessageIds: [],
    })
    gate.resolve(late)
    await disposed.promise
    await h.engine.idle()
    expect(late.messages).toEqual([])
    expect(
      h.store.snapshot.sessions.find((session) => session.sessionId === 'A')
        ?.providerSessionId,
    ).toBe(null)
    expect(
      h.events.flatMap((event) =>
        event.type === 'assistant.completed' ? [event.text] : [],
      ),
    ).toEqual([])
    await h.engine.command(sessionTurn('A', 'next'))
    const next = providers[1]
    if (!next) throw new Error('The next turn did not start.')
    next.emit({ type: 'result', state: 'finished', userMessageIds: [] })
    await h.engine.idle()
    expect(h.events.at(-1)).toMatchObject({
      type: 'turn.completed',
      turnId: 'turn-next',
      state: 'finished',
    })
    expect(h.warnings).toEqual([])
    const immediate = h.engine.command(sessionTurn('immediate'))
    const stopped = h.engine.command(stop('immediate'))
    await Promise.all([immediate, stopped])
    expect(
      h.events
        .filter((event) => event.sessionId === 'immediate')
        .map((event) => event.type),
    ).toEqual(['turn.completed'])
    expect(providers).toHaveLength(2)
  } finally {
    gate.resolve(late)
    await starting
  }
})

it('cancels a session request on Stop and recovers the session after a failed request', async () => {
  const entered = deferred<ProviderOptions>()
  const gate = deferred<void>()
  const providers: FakeProvider[] = []
  const h = await engineFixture({
    providers: {
      claude: async (options) => {
        const provider = new FakeProvider(options)
        providers.push(provider)
        if (providers.length === 1)
          vi.spyOn(provider, 'send').mockImplementation(async () => {
            entered.resolve(options)
            await gate.promise
          })
        if (providers.length === 2)
          vi.spyOn(provider, 'send').mockRejectedValue(
            new Error('Request failed.'),
          )
        return provider
      },
      codex: async () => {
        throw new Error('Unexpected Codex start.')
      },
    },
  })
  const starting = h.engine.command(sessionTurn('request'))
  const options = await entered.promise
  try {
    expect(options.signal).toBeInstanceOf(AbortSignal)
    await h.engine.command(stop('request'))
    await starting
    expect(options.signal?.aborted).toBe(true)
    expect(providers[0]?.stops).toBe(1)
    expect(h.events.map((event) => event.type)).toEqual([
      'turn.started',
      'turn.completed',
    ])
    expect(h.events.at(-1)).toMatchObject({ state: 'stopped', files: [] })
    await h.engine.command(sessionTurn('request', 'failure'))
    expect(h.events.at(-1)).toMatchObject({
      type: 'turn.failed',
      turnId: 'turn-failure',
    })
    await h.engine.command(sessionTurn('request', 'recovered'))
    providers[2]?.emit({
      type: 'result',
      state: 'finished',
      userMessageIds: [],
    })
    await h.engine.idle()
    expect(h.events.map((event) => event.type)).toEqual([
      'turn.started',
      'turn.completed',
      'turn.started',
      'turn.failed',
      'turn.started',
      'turn.completed',
    ])
  } finally {
    gate.resolve()
    await starting
  }
})

it('cancels baseline and completion scans with one ordered terminal event despite duplicate Stop and result callbacks', async () => {
  const kept: ChangedFile = {
    path: 'kept',
    change: 'modified',
    added: 1,
    removed: 0,
  }
  for (const phase of ['baseline', 'completion'] as const) {
    const entered = deferred<AbortSignal | undefined>()
    const baseline = deferred<Checkpoint>()
    const completion = deferred<readonly ChangedFile[]>()
    let first = true
    const h = await engineFixture({
      checkpoint: async (signal) => {
        if (phase === 'baseline' && first) {
          first = false
          entered.resolve(signal)
          return baseline.promise
        }
        return new Map()
      },
      changedSince: async (_before, signal) => {
        if (phase === 'completion' && first) {
          first = false
          entered.resolve(signal)
          return completion.promise
        }
        return [kept]
      },
    })
    const starting = h.engine.command(sessionTurn(phase))
    if (phase === 'completion') {
      await starting
      h.providers.latest.emit({
        type: 'result',
        state: 'finished',
        userMessageIds: [],
      })
    }
    const signal = await entered.promise
    try {
      expect(signal).toBeInstanceOf(AbortSignal)
      const firstStop = h.engine.command(stop(phase))
      const secondStop = h.engine.command(stop(phase, `turn-${phase}`, 'again'))
      h.providers.processes[0]?.emit({
        type: 'result',
        state: 'finished',
        userMessageIds: [],
      })
      await Promise.all([starting, firstStop, secondStop])
      expect(signal?.aborted).toBe(true)
      expect(h.events.map((event) => event.type)).toEqual([
        'turn.started',
        'turn.completed',
      ])
      // Stop cancels the completion scan, and the stopped end reads again.
      expect(h.events.at(-1)).toMatchObject({
        state: 'stopped',
        files: phase === 'completion' ? [kept] : [],
      })
      baseline.resolve(new Map())
      completion.resolve([])
      await h.engine.command(sessionTurn(phase, `${phase}-next`))
      h.providers.latest.emit({
        type: 'result',
        state: 'finished',
        userMessageIds: [],
      })
      await h.engine.idle()
      expect(h.events.at(-1)).toMatchObject({
        type: 'turn.completed',
        state: 'finished',
        files: [kept],
      })
      h.options.checkpoint = async () => {
        throw new Error('Baseline failed.')
      }
      await h.engine.command(sessionTurn(phase, `${phase}-failed`))
      expect(h.events.slice(-2).map((event) => event.type)).toEqual([
        'turn.started',
        'turn.failed',
      ])
    } finally {
      baseline.resolve(new Map())
      completion.resolve([])
      await starting
    }
  }
})
