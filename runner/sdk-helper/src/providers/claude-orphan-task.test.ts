import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { fakeClaudeProfile } from '../../test-support/profile'
import { string } from '../parse'
import { createClaudeFactory } from './claude'
import { ORPHAN_GRACE_MS } from './claude-orphans'

beforeEach(mockComputerServer)
afterEach(() => vi.useRealTimers())

const subagent = {
  task_id: 'agent-1',
  run_id: 'run-1',
  task_type: 'local_agent',
  description: 'Finish the merge',
}
const shell = {
  task_id: 'shell-1',
  run_id: 'run-2',
  task_type: 'local_bash',
  description: 'Run the browser tests',
  parent_task_id: 'agent-1',
}

/**
 * The order of the pinned agent program, from a probe: a subagent starts a
 * shell, ends its reply while the shell runs, and the shell ends later.
 */
async function parkedSubagent() {
  const h = await providerFixture()
  const sdk = new FakeClaudeQuery()
  const saved: (readonly string[])[] = []
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/pinned/claude',
    fakeClaudeProfile,
  )({ ...h.options, backgroundNotes: (ids) => saved.push(ids) })
  onTestFinished(() => provider.close())
  await provider.send(h.command)
  const uuid = string((await sdk.nextUser()).uuid)
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const tasks = (list: object[]) =>
    sdk.raw({
      type: 'system',
      subtype: 'background_tasks_changed',
      tasks: list,
    })
  const ended = (task: object, status: string) =>
    sdk.raw({
      type: 'system',
      subtype: 'task_notification',
      ...task,
      status,
      output_file: '/tmp/tasks/shell-1.output',
      summary: 'Ended',
    })
  await tasks([subagent])
  await sdk.raw({
    type: 'system',
    subtype: 'task_started',
    task_id: 'agent-1',
    tool_use_id: 'tool-agent',
    task_type: 'local_agent',
  })
  await tasks([subagent, shell])
  await ended(subagent, 'completed')
  await tasks([shell])
  await sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    user_message_uuid: uuid,
  })
  await sdk.raw({
    type: 'system',
    subtype: 'session_state_changed',
    state: 'idle',
  })
  const live = () =>
    h.events.findLast((event) => event.type === 'background')?.live
  return { ...h, sdk, saved, tasks, ended, live }
}

it('holds the turn, then sends one note when a parked subagent does not wake', async () => {
  const h = await parkedSubagent()
  await h.ended(shell, 'completed')
  await h.tasks([])
  expect(h.live()).toBe(true)
  await vi.advanceTimersByTimeAsync(ORPHAN_GRACE_MS)
  const note = await h.sdk.nextUser()
  expect(note.message.content).toEqual(
    expect.stringContaining(
      '- Task shell-1, "Run the browser tests", started by subagent agent-1 ("Finish the merge"). It completed. Its output is in /tmp/tasks/shell-1.output.',
    ),
  )
  expect(h.saved).toHaveLength(1)
  expect(h.live()).toBe(true)
  await h.sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    user_message_uuid: string(note.uuid),
  })
  expect(h.events.filter((event) => event.type === 'wake-up')).toEqual([
    { type: 'wake-up', state: 'finished' },
  ])
  expect(h.live()).toBe(false)
})

it('sends no note when the subagent wakes in the grace time', async () => {
  const h = await parkedSubagent()
  await h.ended(shell, 'completed')
  await h.tasks([])
  await h.tasks([{ ...subagent, run_id: 'run-3' }])
  await h.ended({ ...subagent, run_id: 'run-3' }, 'completed')
  await h.tasks([])
  expect(h.live()).toBe(false)
  await vi.advanceTimersByTimeAsync(ORPHAN_GRACE_MS)
  expect(h.saved).toEqual([])
})

it('holds no turn for a task that an agent stopped', async () => {
  const h = await parkedSubagent()
  await h.ended(shell, 'stopped')
  await h.tasks([])
  expect(h.live()).toBe(false)
})

it('ends the hold when the subagent model replies again', async () => {
  const h = await parkedSubagent()
  await h.ended(shell, 'completed')
  await h.tasks([])
  await h.sdk.raw({
    type: 'assistant',
    parent_tool_use_id: 'tool-agent',
    message: { id: 'sub-1', content: [{ type: 'text', text: 'Tests pass.' }] },
  })
  expect(h.live()).toBe(false)
  await vi.advanceTimersByTimeAsync(ORPHAN_GRACE_MS)
  expect(h.saved).toEqual([])
})
