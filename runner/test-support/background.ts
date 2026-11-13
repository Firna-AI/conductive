import { beforeEach, afterEach, expect, vi } from 'vitest'

import type { EngineOptions } from '../src/engine-session'
import { createClaudeFactory } from '../sdk-helper/src/providers/claude'
import * as environment from '../sdk-helper/src/providers/environment'
import { FakeClaudeQuery } from '../sdk-helper/test-support/claude-query'
import { mockComputerServer } from '../sdk-helper/test-support/computer-mcp'
import { engineFixture } from './engine'
import { turn } from './harness'
import { FakeProviders } from './providers'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(100)
  mockComputerServer()
  vi.spyOn(environment, 'prepareProviderHome').mockResolvedValue()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

export async function backgroundFixture(
  overrides: Partial<EngineOptions> = {},
) {
  const sdk = new FakeClaudeQuery()
  const removed = vi.fn(async () => {})
  const h = await engineFixture({
    now: () => Date.now(),
    providers: {
      claude: createClaudeFactory(
        sdk.open,
        () => '/pinned/claude',
        async () => ({
          directory: '/private/profile',
          name: 'profile',
          remove: removed,
        }),
      ),
      codex: new FakeProviders().open,
    },
    ...overrides,
  })
  await h.engine.command(turn())
  const first = await sdk.nextUser()
  const raw = async (value: unknown) => {
    await sdk.raw(value)
    await h.engine.idle()
  }
  const tasks = (ambient = false) =>
    raw({
      type: 'system',
      subtype: 'background_tasks_changed',
      tasks: [
        {
          task_id: 'watch',
          task_type: 'local_bash',
          description: 'Watch checks',
          ambient,
        },
      ],
    })
  const state = (state: string) =>
    raw({ type: 'system', subtype: 'session_state_changed', state })
  const result = () =>
    raw({ type: 'result', is_error: false, user_message_uuids: [first.uuid] })
  const wake = () =>
    raw({
      type: 'result',
      is_error: false,
      origin: { kind: 'task-notification' },
      user_message_uuids: [],
    })
  const ends = () =>
    h.events.filter(
      (event) =>
        event.type === 'turn.completed' || event.type === 'turn.failed',
    )
  const wait = async () => {
    await state('running')
    await tasks()
    await result()
    expect(ends()).toEqual([])
    await state('idle')
  }
  const stopHook = async (
    crons: {
      id: string
      schedule: string
      recurring: boolean
      prompt: string
    }[],
  ) => {
    const hook = sdk.parameters?.options?.hooks?.Stop?.[0]?.hooks[0]
    await hook?.(
      {
        hook_event_name: 'Stop',
        session_id: 'sdk-session',
        transcript_path: '/transcript',
        cwd: '/repo',
        stop_hook_active: false,
        background_tasks: [],
        session_crons: crons,
      },
      undefined,
      { signal: new AbortController().signal },
    )
    await h.engine.idle()
  }
  return {
    ...h,
    sdk,
    first,
    removed,
    raw,
    tasks,
    state,
    result,
    wake,
    ends,
    wait,
    stopHook,
  }
}

export const clearTasks = {
  type: 'system',
  subtype: 'background_tasks_changed',
  tasks: [],
}
