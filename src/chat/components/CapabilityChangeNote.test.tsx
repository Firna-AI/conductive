import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CapabilityChangeNote } from '../../shared/capability-change'
import { FAKE_IDS, fakeUsers } from '../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { readEnvelope } from '../api/read-workspace'
import { chatFor, shown } from '../state/test-kit'
import { textOf } from './render-kit'
import { ItemView } from './TranscriptItem'

const { workspace: ws, session: first } = FAKE_IDS
const priya = senderSnapshot(fakeUsers[1])
const preApproved: CapabilityChangeNote['changes'] = [
  { kind: 'pre-approved', names: ['VERCEL_TOKEN'] },
]
const noteLine = `capabilities changed by ${priya.githubLogin}: pre-approved`

function note(
  sessionId: string,
  changes: CapabilityChangeNote['changes'] = preApproved,
): CapabilityChangeNote {
  return {
    type: 'capabilities.changed',
    sessionId,
    noteId: 'note-1',
    member: priya,
    changes,
  }
}

function envelope(event: unknown) {
  return { workspaceId: ws, eventNumber: 9, occurredAt: 25, event }
}

describe('the note of a change of the capabilities', () => {
  it('reads each kind of change from the stream, and keeps the number of a note or an event that it cannot read', () => {
    const every = note(first, [
      { kind: 'pre-approved', names: ['VERCEL_TOKEN', 'FIGMA_TOKEN'] },
      { kind: 'pre-approval-removed', names: ['SENTRY_AUTH_TOKEN'] },
      { kind: 'session-approval-removed', names: ['PROD_DATABASE_URL'] },
      { kind: 'value-given', names: ['MAPBOX_TOKEN'] },
      { kind: 'value-removed', names: ['PLACES_KEY'] },
    ])
    const unreadable: readonly unknown[] = [
      { ...every, changes: [{ kind: 'all-agents-marked', names: ['A'] }] },
      { ...every, changes: [{ kind: 'pre-approved', names: 'VERCEL_TOKEN' }] },
      { ...every, changes: [{ kind: 'pre-approved', names: [7] }] },
      {
        ...every,
        changes: [...every.changes, { kind: 'mac-access', on: true }],
      },
      { ...every, changes: { kind: 'pre-approved', names: ['VERCEL_TOKEN'] } },
      { ...every, noteId: undefined },
      { ...every, sessionId: null },
      { ...every, member: { ...priya, githubLogin: undefined } },
      { type: 'capabilities.reviewed', sessionId: first, noteId: 'note-2' },
    ]

    expect(readEnvelope(envelope(every))).toEqual({
      ...envelope(every),
      late: false,
    })
    expect(unreadable.map((event) => readEnvelope(envelope(event)))).toEqual(
      unreadable.map(() => ({ ...envelope(null), late: false })),
    )
  })

  it('shows once at its place in the session, also when the stream repeats it and a new tab replays it', async () => {
    const chat = chatFor()
    await chat.controller.start()
    chat.emit(note(first))
    chat.emit({
      type: 'message.accepted',
      message: {
        ...workspaceFixtures().message,
        id: 'after-note',
        sessionId: first,
        text: 'Deploy a preview of the checkout.',
      },
    })
    chat.emit(note(first))
    const replay = chatFor({ stream: chat.server.events })
    await replay.controller.start()

    expect([
      shown(chat.controller, first).slice(-2),
      shown(replay.controller, first).slice(-2),
    ]).toEqual([
      [noteLine, 'user: Deploy a preview of the checkout.'],
      [noteLine, 'user: Deploy a preview of the checkout.'],
    ])
  })

  it('names the member who made the change, or You to that member, with each secret of the change', () => {
    const render = (viewerId: string) =>
      textOf(
        renderToStaticMarkup(
          <ItemView
            actions={{
              canRetry: false,
              retrying: false,
              onRetry: () => undefined,
            }}
            item={{
              kind: 'capabilities-changed',
              id: 'capabilities-changed:note-1',
              member: priya,
              changes: preApproved,
            }}
            readers={{ viewerId, members: [] }}
          />,
        ),
      ).trim()

    expect([render(priya.id), render(fakeUsers[0].id)]).toEqual([
      'You pre-approved VERCEL_TOKEN .',
      'Priya Raman pre-approved VERCEL_TOKEN .',
    ])
  })
})
