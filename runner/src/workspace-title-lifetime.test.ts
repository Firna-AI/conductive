import { spawn } from 'node:child_process'

import { afterEach, expect, it, vi } from 'vitest'

import { runnerHarness, turn } from '../test-support/harness'
import { deferred } from '../test-support/runtime'
import { FakeTitles, titleQuery } from '../test-support/titles'
import { createClaudeTitle } from './providers/claude-title'
import { createCodexTitle } from './providers/codex-title'
import { FakeChild } from '../test-support/child'

vi.mock('node:child_process', async (original) => ({
  ...(await original<typeof import('node:child_process')>()),
  spawn: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('stops a title request at 60 seconds without delaying or stopping its turn', async () => {
  const q = titleQuery()
  vi.mocked(spawn).mockReturnValue(q.child)
  const titles = new FakeTitles()
  const h = await runnerHarness({
    titles: {
      ...titles.agents,
      claude: createClaudeTitle(q.start, () => '/pinned/claude'),
    },
  })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  h.endpoint.send(turn())
  await q.opened.promise
  await h.runner.engine.idle()
  expect(h.providers.latest.messages.map(({ turnId }) => turnId)).toEqual([
    'turn-1',
  ])
  expect(h.providers.latest.closed).toBe(false)
  await vi.advanceTimersByTimeAsync(59_999)
  expect(q.child.signals).toEqual([])
  expect(h.warnings).toEqual([])
  await vi.advanceTimersByTimeAsync(1)
  expect(q.child.signals).toEqual(['SIGTERM'])
  await h.runner.idle()
  expect(q.sdk.closed).toBe(true)
  expect(h.providers.latest.closed).toBe(false)
  expect(
    h.endpoint.runnerEvents.filter(
      ({ event }) => event.type === 'workspace.title',
    ),
  ).toEqual([])
  expect(h.warnings).toEqual(['The workspace title request failed.'])
  await h.runner.close()
})

it.each(['claude', 'codex'] as const)(
  'waits for the hidden %s process to exit during shutdown and sends no title',
  async (agent) => {
    const q = titleQuery()
    const child = agent === 'claude' ? q.child : new FakeChild()
    child.exitOnSignal = null
    child.rpc = agent === 'codex'
    const entered = deferred<void>()
    child.onRequest = (method) => {
      if (method === 'turn/start') entered.resolve()
    }
    vi.mocked(spawn).mockReturnValue(child)
    const titles = new FakeTitles()
    const h = await runnerHarness({
      titles: {
        ...titles.agents,
        claude: createClaudeTitle(q.start, () => '/pinned/claude'),
        codex: createCodexTitle(),
      },
    })
    const killed = deferred<void>()
    child.onKill = () => killed.resolve()
    h.endpoint.send(turn('close', 'alice', agent))
    await (agent === 'claude' ? q.opened.promise : entered.promise)
    await h.runner.engine.idle()
    let closed = false
    const persisted = vi.spyOn(h.runner.link, 'persist')
    const closing = h.runner.close().then(() => {
      closed = true
    })
    try {
      await killed.promise
      await h.runner.engine.close()
      await h.runner.link.idle()
      expect(child.signals).toEqual(['SIGTERM'])
      expect(persisted).not.toHaveBeenCalled()
      expect(closed).toBe(false)
      expect(
        h.endpoint.runnerEvents.filter(
          ({ event }) => event.type === 'workspace.title',
        ),
      ).toEqual([])
    } finally {
      child.exit(null, 'SIGTERM')
      await closing
    }
    expect(
      h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'workspace.title',
      ),
    ).toEqual([])
    expect(h.warnings).toEqual(['The workspace title request failed.'])
  },
)
