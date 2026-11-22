import { expect, it } from 'vitest'

import {
  compacted,
  complete,
  context,
  envelope,
  message,
  session,
  start,
} from './batch-fold.test-support'
import { SessionLog } from './session-log'
import { emptyTranscript } from './transcript'

it.each([true, false])(
  'keeps compacted pages in order with the list record first=%s and leaves published snapshots unchanged',
  (recordFirst) => {
    const events = compacted(2)
    const log = new SessionLog()
    if (recordFirst) log.offer(session, 11)
    log.merge(events.slice(5))
    const newest = log.transcript
    const newestTimes = log.times
    const saved = structuredClone(newest)
    log.merge([...events.slice(0, 5), ...events.slice(5)])
    if (!recordFirst) log.offer(session, 11)
    expect(log.transcript).toEqual({
      ...emptyTranscript,
      items: [0, 1].flatMap((index) => {
        const id = `turn-${index}`
        return [
          {
            kind: 'user',
            id: `user:${id}`,
            message: { ...message(id), state: 'sent' },
          },
          {
            kind: 'tool',
            id: `tool:${id}:tool`,
            turnId: id,
            tool: {
              id: 'tool',
              kind: 'run',
              target: 'check',
              detail: 'Output',
              omittedDetailBytes: 3,
              state: 'done',
            },
          },
          {
            kind: 'agent',
            id: `agent:${id}:answer`,
            turnId: id,
            text: `Answer ${index}`,
            complete: true,
          },
          {
            kind: 'turn-end',
            id: `end:${id}`,
            turnId: id,
            durationMs: 3,
            files: [],
          },
        ]
      }),
      turns: [
        { id: 'turn-0', ended: true, messageIds: ['turn-0'] },
        { id: 'turn-1', ended: true, messageIds: ['turn-1'] },
      ],
      turnCompletions: {
        'turn-0': complete('turn-0'),
        'turn-1': complete('turn-1'),
      },
    })
    expect([...log.times]).toEqual([
      ['user:turn-0', 10],
      ['tool:turn-0:tool', 30],
      ['agent:turn-0:answer', 40],
      ['end:turn-0', 50],
      ['user:turn-1', 60],
      ['tool:turn-1:tool', 80],
      ['agent:turn-1:answer', 90],
      ['end:turn-1', 100],
    ])
    expect(log.record).toEqual({ eventNumber: 11, session })
    expect(log.merge(events)).toBe(false)
    expect(newest).toEqual(saved)
    expect([...newestTimes]).toEqual([
      ['user:turn-1', 60],
      ['tool:turn-1:tool', 80],
      ['agent:turn-1:answer', 90],
      ['end:turn-1', 100],
    ])
  },
)

it('folds a reply before its stream events at the record number and preserves retry and stop attribution', () => {
  const log = new SessionLog()
  const stopped = { ...complete('old'), state: 'stopped' as const }
  const reference = { workspaceId: 'source', sessionId: 'from' }
  log.offer({ ...session, retryMessageId: 'old' }, 6)
  log.merge([
    envelope(1, { type: 'message.accepted', message: message('old') }),
    envelope(2, start('old')),
    envelope(3, {
      ...context('old'),
      type: 'turn.stop-requested',
      requestedBySession: reference,
    }),
    envelope(4, {
      ...context('old'),
      type: 'turn.stop-requested',
      requestedById: 'second',
    }),
    envelope(5, stopped),
  ])
  const previous = log.transcript
  const saved = structuredClone(previous)
  log.offer({ ...session, activeTurnId: 'new', activeTurnStartedAt: 70 }, 9)
  log.merge([
    envelope(7, { type: 'message.accepted', message: message('new') }),
    envelope(8, { ...start('new'), startedAt: 70 }),
    envelope(9, {
      type: 'session.updated',
      session: { ...session, activeTurnId: 'new', activeTurnStartedAt: 70 },
    }),
  ])
  expect(log.transcript).toEqual({
    ...emptyTranscript,
    items: [
      {
        kind: 'user',
        id: 'user:old',
        message: { ...message('old'), state: 'sent' },
      },
      {
        kind: 'stopped',
        id: 'stopped:old',
        turnId: 'old',
        by: null,
        from: reference,
      },
      {
        kind: 'user',
        id: 'user:new',
        message: { ...message('new'), state: 'sent' },
      },
    ],
    turns: [
      { id: 'old', ended: true, messageIds: ['old'] },
      { id: 'new', ended: false, messageIds: ['new'] },
    ],
    turn: {
      turnId: 'new',
      startedAt: 70,
      choice: session.choice,
      thinking: false,
    },
    turnCompletions: { old: stopped },
  })
  expect([...log.times]).toEqual([
    ['user:old', 10],
    ['stopped:old', 50],
    ['user:new', 70],
  ])
  expect(previous).toEqual(saved)
})
