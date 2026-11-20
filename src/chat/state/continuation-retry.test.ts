import { expect, it } from 'vitest'

import type { SendMessageResponse } from '../../shared/messages'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  acceptedIn,
  LINKED,
  linkedRecord,
  memberChat,
  pendingIn,
} from './linked-kit'

it('opens a linked continuation retry without showing its hidden app message as pending input', async () => {
  const chat = memberChat({
    conversation: 'failed',
    change: (session) => ({
      ...session,
      retryMessageId: 'continuation:failed',
    }),
    wrap: (opens) => async (request) => {
      if (!request.url.endsWith('/retry')) return opens(request)
      const reply: SendMessageResponse = {
        eventNumber: 0,
        message: acceptedIn(
          LINKED,
          'continuation:fresh',
          'Hidden app instruction.',
        ),
        turnId: null,
        session: linkedRecord(),
      }
      return Response.json(reply, { status: 202 })
    },
  })
  await chat.controller.start()
  await chat.controller.retry(FAKE_IDS.session, 'continuation:failed')
  expect(chat.controller.getSnapshot().activeSessionId).toBe(LINKED)
  expect(pendingIn(chat, LINKED)).toEqual([])
  expect(
    chat.controller.getSnapshot().sessionStates[LINKED]?.transcript.items,
  ).toEqual([])
})
