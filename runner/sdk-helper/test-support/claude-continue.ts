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
    stream: (event: unknown, fields: Record<string, unknown> | null = {}) =>
      sdk.raw({
        type: 'stream_event',
        ...(fields === null ? {} : { user_message_uuid: uuid, ...fields }),
        event,
      }),
    tasks: () =>
      sdk.raw({
        type: 'system',
        subtype: 'background_tasks_changed',
        tasks: [{ task_id: 'watch', task_type: 'local_bash' }],
      }),
  }
}

export async function wakeContinueFixture() {
  const h = await continueFixture()
  await h.tasks()
  await h.sdk.raw({
    type: 'result',
    is_error: false,
    user_message_uuid: h.uuid,
  })
  await h.drop({
    origin: { kind: 'task-notification' },
    user_message_uuids: [],
  })
  return { ...h, continued: string((await h.sdk.nextUser()).uuid) }
}

export async function claudeReply(
  h: Awaited<ReturnType<typeof continueFixture>>,
  id: string,
  options: {
    uuids?: readonly string[]
    text: string
    thinking?: boolean
    tool?: string
  },
) {
  const stamp = options.uuids
    ? {
        user_message_uuid: options.uuids.at(-1),
        user_message_uuids: options.uuids,
      }
    : null
  await h.stream({ type: 'message_start', message: { id } }, stamp)
  let index = 0
  if (options.thinking) {
    await h.stream(
      {
        type: 'content_block_start',
        index,
        content_block: { type: 'thinking', thinking: '' },
      },
      null,
    )
    await h.sdk.raw({
      type: 'assistant',
      message: { id, content: [{ type: 'thinking', thinking: 'Think.' }] },
      ...stamp,
    })
    index++
  }
  await h.stream(
    {
      type: 'content_block_start',
      index,
      content_block: { type: 'text', text: '' },
    },
    null,
  )
  await h.stream(
    {
      type: 'content_block_delta',
      index,
      delta: { type: 'text_delta', text: options.text },
    },
    null,
  )
  await h.sdk.raw({
    type: 'assistant',
    message: { id, content: [{ type: 'text', text: options.text }] },
    ...(options.thinking ? {} : stamp),
  })
  if (options.tool)
    await h.sdk.raw({
      type: 'assistant',
      message: {
        id,
        content: [
          { type: 'tool_use', id: options.tool, name: 'Bash', input: {} },
        ],
      },
    })
  await h.stream({ type: 'message_stop' }, null)
  if (options.tool)
    await h.sdk.raw({
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: options.tool }],
      },
    })
}
