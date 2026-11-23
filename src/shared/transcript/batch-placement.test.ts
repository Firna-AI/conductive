import { expect, it } from 'vitest'

import {
  complete,
  context,
  envelope,
  message,
  start,
} from './batch-fold.test-support'
import { SessionLog } from './session-log'
import { foldEvent } from './transcript'

it('keeps late and unknown-turn items before their boundaries and moves a result after its steer message', () => {
  const log = new SessionLog()
  log.merge([
    envelope(1, { type: 'message.accepted', message: message('old') }),
    envelope(2, start('old')),
    envelope(3, {
      ...context('old'),
      type: 'assistant.delta',
      messageId: 'answer',
      text: 'Partial',
    }),
    envelope(4, { type: 'message.accepted', message: message('steer') }),
    envelope(5, {
      ...context('old'),
      type: 'message.sent',
      messageId: 'steer',
    }),
    envelope(6, {
      ...context('old'),
      type: 'assistant.completed',
      messageId: 'answer',
      text: 'Complete',
      userMessageIds: ['old', 'steer'],
    }),
    envelope(7, complete('old')),
    envelope(8, { type: 'message.accepted', message: message('new') }),
    envelope(9, start('new')),
    envelope(10, {
      ...context('old'),
      type: 'assistant.delta',
      messageId: 'late',
      text: 'Late',
    }),
    envelope(
      11,
      {
        ...context('unknown'),
        type: 'assistant.delta',
        messageId: 'late',
        text: 'Unknown',
      },
      true,
    ),
  ])
  expect(log.transcript.items).toEqual([
    {
      kind: 'user',
      id: 'user:old',
      message: { ...message('old'), state: 'sent' },
    },
    {
      kind: 'user',
      id: 'user:steer',
      message: { ...message('steer'), state: 'sent' },
    },
    {
      kind: 'agent',
      id: 'agent:old:answer',
      turnId: 'old',
      text: 'Complete',
      complete: true,
    },
    { kind: 'agent', id: 'agent:old:late', turnId: 'old', text: 'Late' },
    {
      kind: 'turn-end',
      id: 'end:old',
      turnId: 'old',
      durationMs: 3,
      files: [],
    },
    {
      kind: 'agent',
      id: 'agent:unknown:late',
      turnId: 'unknown',
      text: 'Unknown',
    },
    {
      kind: 'user',
      id: 'user:new',
      message: { ...message('new'), state: 'sent' },
    },
  ])
  expect(log.transcript.turns).toEqual([
    { id: 'old', ended: true, messageIds: ['old', 'steer'] },
    { id: 'new', ended: false, messageIds: ['new'] },
  ])
  const prior = log.transcript
  const saved = structuredClone(prior)
  const next = foldEvent(
    prior,
    {
      ...context('old'),
      type: 'assistant.delta',
      messageId: 'answer',
      text: ' appended',
    },
    120,
  )
  expect(next.items[2]).toEqual({
    kind: 'agent',
    id: 'agent:old:answer',
    turnId: 'old',
    text: 'Complete appended',
    complete: true,
  })
  expect(prior).toEqual(saved)
  const requested = foldEvent(
    prior,
    {
      ...context('new'),
      type: 'turn.stop-requested',
      requestedById: 'first',
    },
    130,
  )
  const requestedSnapshot = structuredClone(requested)
  const ended = foldEvent(
    requested,
    {
      ...complete('new'),
      state: 'stopped',
    },
    140,
  )
  expect(requested.stopRequests).toEqual({ new: 'first' })
  expect(ended.stopRequests).toEqual({})
  expect(ended.items.at(-1)).toEqual({
    kind: 'stopped',
    id: 'stopped:new',
    turnId: 'new',
    by: 'first',
  })
  expect(requested).toEqual(requestedSnapshot)
})
