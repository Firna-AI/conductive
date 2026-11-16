import { beforeEach, onTestFinished } from 'vitest'

import { createClaudeFactory } from '../src/providers/claude'
import { string } from '../src/parse'
import { FakeClaudeQuery } from './claude-query'
import { mockComputerServer } from './computer-mcp'
import { providerFixture } from './fixture'
import { fakeClaudeProfile } from './profile'

beforeEach(mockComputerServer)

export const dropText =
  'API Error: Connection lost mid-response. The response above may be incomplete.'

export const continueText =
  'The connection to the model dropped before your last response finished. Continue from where you stopped. Do not repeat work that is already done. Start your reply with one short sentence that says that the connection to the model dropped and that you continue.'

export async function continueFixture() {
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
  return {
    ...h,
    sdk,
    provider,
    uuid,
    ends: () =>
      h.events.filter(
        (event) =>
          event.type === 'failed' ||
          event.type === 'result' ||
          event.type === 'wake-up',
      ),
    drop: (fields: Record<string, unknown> = {}) =>
      sdk.raw({
        type: 'result',
        subtype: 'error_during_execution',
        is_error: true,
        errors: [dropText],
        user_message_uuids: [uuid],
        ...fields,
      }),
    stream: (event: unknown, fields: Record<string, unknown> = {}) =>
      sdk.raw({
        type: 'stream_event',
        user_message_uuid: uuid,
        event,
        ...fields,
      }),
    tasks: () =>
      sdk.raw({
        type: 'system',
        subtype: 'background_tasks_changed',
        tasks: [{ task_id: 'watch', task_type: 'local_bash' }],
      }),
  }
}
