import { expect, it } from 'vitest'

import type {
  ChatWorkspaceSummary,
  ChatWorkspaceSummaryOptions,
} from '../chat/workspace-summary'
import type { DurableLifecycleState } from './durable-types'
import { FIRST_MESSAGE } from './durable-test-support'
import { waitingSummary } from './waiting-summary'

const base: ChatWorkspaceSummary = {
  throughEventNumber: 4,
  lastOutputEventNumber: 2,
  working: false,
}

/** A chat whose queue holds a waiting message or not. */
function chat(queued: boolean) {
  return {
    async workspaceSummary(
      _workspaceId?: string,
      options?: ChatWorkspaceSummaryOptions,
    ): Promise<ChatWorkspaceSummary> {
      return options?.messageWaiting
        ? { ...base, messageWaiting: queued }
        : base
    },
  }
}

/** A lifecycle that holds a first message that the chat has not accepted. */
function lifecycle(first: boolean) {
  return async (): Promise<
    Pick<DurableLifecycleState, 'pendingFirstMessage'>
  > => ({ pendingFirstMessage: first ? FIRST_MESSAGE : null })
}

it('counts a message in the chat queue', async () => {
  expect(
    await waitingSummary(chat(true), lifecycle(false), {
      messageWaiting: true,
    }),
  ).toEqual({ ...base, messageWaiting: true })
})

it('counts a first message that the chat has not accepted yet', async () => {
  expect(
    await waitingSummary(chat(false), lifecycle(true), {
      messageWaiting: true,
    }),
  ).toEqual({ ...base, messageWaiting: true })
})

it('says that no message waits when neither holds one', async () => {
  expect(
    await waitingSummary(chat(false), lifecycle(false), {
      messageWaiting: true,
    }),
  ).toEqual({ ...base, messageWaiting: false })
  expect(
    await waitingSummary(chat(false), async () => undefined, {
      messageWaiting: true,
    }),
  ).toEqual({ ...base, messageWaiting: false })
})

it('reads neither when the caller does not ask', async () => {
  const read = async (): Promise<undefined> => {
    throw new Error('The lifecycle read is not needed.')
  }
  expect(await waitingSummary(chat(true), read)).toEqual(base)
})
