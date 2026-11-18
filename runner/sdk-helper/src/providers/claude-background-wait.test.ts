import { beforeEach, expect, it, onTestFinished } from 'vitest'

import { FakeClaudeQuery } from '../../test-support/claude-query'
import { mockComputerServer } from '../../test-support/computer-mcp'
import { providerFixture } from '../../test-support/fixture'
import { fakeClaudeProfile } from '../../test-support/profile'
import { string } from '../parse'
import { createClaudeFactory } from './claude'

beforeEach(mockComputerServer)

async function fixture() {
  const h = await providerFixture()
  const sdk = new FakeClaudeQuery()
  const provider = await createClaudeFactory(
    sdk.open,
    () => '/pinned/claude',
    fakeClaudeProfile,
  )(h.options)
  onTestFinished(() => provider.close())
  await provider.send(h.command)
  const uuid = string((await sdk.nextUser()).uuid)
  const callback = sdk.parameters?.options?.hooks?.Stop?.[0]?.hooks[0]
  if (!callback) throw new Error('The adapter did not register its Stop hook.')
  const stop = () =>
    callback(
      {
        hook_event_name: 'Stop',
        session_id: 'sdk-session',
        transcript_path: '/transcript',
        cwd: '/repo',
        stop_hook_active: false,
      },
      undefined,
      { signal: new AbortController().signal },
    )
  const tasks = (ids: string[]) =>
    sdk.raw({
      type: 'system',
      subtype: 'background_tasks_changed',
      tasks: ids.map((id) => ({
        task_id: id,
        task_type: 'local_bash',
        description: 'Serve the mockups',
      })),
    })
  const ends = () =>
    h.events.filter(
      (event) => event.type === 'result' || event.type === 'wake-up',
    )
  return { ...h, sdk, uuid, stop, tasks, ends }
}

it('ends a wake-up reply for a task that ended before the member result', async () => {
  const h = await fixture()
  await h.tasks(['server'])
  // The agent stops its server and then ends its reply before the
  // program reports idle. The engine waits for that idle state.
  await h.tasks([])
  await h.stop()
  await h.sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    user_message_uuid: h.uuid,
  })
  // The program then runs the reply to the notice of the ended task.
  await h.stop()
  await h.sdk.raw({
    type: 'result',
    subtype: 'success',
    is_error: false,
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  expect(h.ends()).toEqual([
    { type: 'result', state: 'finished', userMessageIds: ['message-1'] },
    { type: 'wake-up', state: 'finished' },
  ])
})
