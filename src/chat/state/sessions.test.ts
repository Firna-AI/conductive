import { describe, expect, it } from 'vitest'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { initialSnapshot, type Overlay } from './chat-snapshot'
import { placeSession } from './sessions'

const [first, second] = workspaceFixtures().sessions.sessions

/** The overlay after `closed` closes, such as through another member. */
function overlayAfterClose(overlay: Overlay, closed = first): Overlay {
  const snapshot = {
    ...initialSnapshot,
    sessions: [first, second],
    activeSessionId: first.id,
    overlay,
  }
  return placeSession(snapshot, { ...closed, closedAt: FAKE_TIME }).overlay
}

describe('placeSession', () => {
  it('drops a closed session from the question before a close, and ends a question that then names no session', () => {
    expect([
      overlayAfterClose({ kind: 'close', sessionIds: [first.id, second.id] }),
      overlayAfterClose({ kind: 'close', sessionIds: [first.id] }),
      overlayAfterClose({ kind: 'close', sessionIds: [second.id] }),
    ]).toEqual([
      { kind: 'close', sessionIds: [second.id] },
      { kind: 'none' },
      { kind: 'close', sessionIds: [second.id] },
    ])
  })

  it('ends the rename of a closed session, and keeps the rename of another', () => {
    expect([
      overlayAfterClose({ kind: 'rename', sessionId: first.id }),
      overlayAfterClose({ kind: 'rename', sessionId: second.id }),
    ]).toEqual([{ kind: 'none' }, { kind: 'rename', sessionId: second.id }])
  })
})
