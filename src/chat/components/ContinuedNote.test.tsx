import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { chatHistoryPath, type WorkspaceEvent } from '../../shared/events'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { chatFor, shown } from '../state/test-kit'
import { emptyTranscript } from '../state/transcript'
import { textOf } from './render-kit'
import { ItemView } from './TranscriptItem'

const { org, workspace: ws, session: first } = FAKE_IDS
const branch = 'calummoore/porto-3f8d'
const priya = senderSnapshot(fakeUsers[1])
const noteLine = `continued by ${priya.githubLogin}: ${branch} from main`

function note(sessionId: string): WorkspaceEvent {
  return {
    type: 'workspace.continued',
    sessionId,
    member: priya,
    branch,
    baseBranch: 'main',
  }
}

describe('the note of Continue', () => {
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
        text: 'Start the next task.',
      },
    })
    chat.emit(note(first))
    const replay = chatFor({ stream: chat.server.events })
    await replay.controller.start()

    expect([
      shown(chat.controller, first).slice(-2),
      shown(replay.controller, first).slice(-2),
    ]).toEqual([
      [noteLine, 'user: Start the next task.'],
      [noteLine, 'user: Start the next task.'],
    ])
  })

  it('shows in a closed session when its stored history loads', async () => {
    const chat = chatFor()
    const closed = workspaceFixtures().sessions.history[0].id
    chat.server.json('GET', chatHistoryPath(org, ws, closed), {
      events: [
        {
          workspaceId: ws,
          eventNumber: 900,
          occurredAt: FAKE_TIME,
          event: note(closed),
        },
      ],
      throughEventNumber: 900,
    })
    await chat.controller.start()

    await chat.controller.loadHistory(closed)

    expect(shown(chat.controller, closed)).toEqual([noteLine])
  })

  it('names the member who pressed Continue, or You to that member, with the new branch and its base', () => {
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
              kind: 'continued',
              id: `continued:${branch}`,
              member: priya,
              branch,
              baseBranch: 'main',
            }}
            readers={{ viewerId, members: [] }}
            transcript={emptyTranscript}
          />,
        ),
      ).trim()

    expect([render(priya.id), render(fakeUsers[0].id)]).toEqual([
      `You continued on ${branch} , a new branch from main`,
      `${priya.displayName ?? ''} continued on ${branch} , a new branch from main`,
    ])
  })
})
