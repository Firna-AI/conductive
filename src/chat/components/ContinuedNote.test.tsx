import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { TranscriptDetail } from '../../shared/generated/TranscriptDetail'
import { chatHistoryPath, type WorkspaceEvent } from '../../shared/events'
import { SessionMarkdown } from '../../shared/transcript/session-markdown'
import { markdownFixture } from '../../shared/transcript/session-markdown.test-support'
import {
  FAKE_IDS,
  FAKE_TIME,
  fakeUsers,
} from '../../test-support/fixtures/core'
import {
  MASKED_CONTINUED,
  MASKED_DEFAULT,
} from '../../test-support/fixtures/masked-paths'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import type { ChatController } from '../state/controller'
import { chatFor, shown } from '../state/test-kit'
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

/**
 * The note of a Continue whose new branch and default branch hold the fake
 * value of a secret. `labels` adds the labels that the Worker sends beside
 * the real names.
 */
function maskedNote(sessionId: string, labels: boolean): WorkspaceEvent {
  return {
    type: 'workspace.continued',
    sessionId,
    member: priya,
    branch: MASKED_CONTINUED.branch,
    baseBranch: MASKED_DEFAULT.baseBranch,
    ...(labels
      ? {
          displayBranch: MASKED_CONTINUED.displayBranch,
          displayBaseBranch: MASKED_DEFAULT.displayBaseBranch,
        }
      : {}),
  }
}

/** The text of each note of a session, as the chat draws it to a teammate. */
function drawnNotes(controller: ChatController, sessionId: string): string[] {
  const state = controller.getSnapshot().sessionStates[sessionId]
  return (state?.transcript.items ?? []).flatMap((item) =>
    item.kind === 'continued'
      ? [
          textOf(
            renderToStaticMarkup(
              <ItemView
                actions={{
                  canRetry: false,
                  retrying: false,
                  onRetry: () => undefined,
                }}
                item={item}
                readers={{ viewerId: fakeUsers[0].id, members: [] }}
              />,
            ),
          ).trim(),
        ]
      : [],
  )
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
          />,
        ),
      ).trim()

    expect([render(priya.id), render(fakeUsers[0].id)]).toEqual([
      `You continued on ${branch} , a new branch from main`,
      `${priya.displayName ?? ''} continued on ${branch} , a new branch from main`,
    ])
  })

  it('names the branches by their labels, once at its place for its real branch, also when a repeat brings the labels and a new tab replays it', async () => {
    const chat = chatFor()
    await chat.controller.start()
    // The first copy came while the value was no secret yet, so it has no
    // labels. A repeat of the same note brings them.
    chat.emit(maskedNote(first, false))
    chat.emit({
      type: 'message.accepted',
      message: {
        ...workspaceFixtures().message,
        id: 'after-note',
        sessionId: first,
        text: 'Start the next task.',
      },
    })
    chat.emit(maskedNote(first, true))
    const replay = chatFor({ stream: chat.server.events })
    await replay.controller.start()

    // The test kit shows the real names that the note keeps.
    const kept = `continued by ${priya.githubLogin}: ${MASKED_CONTINUED.branch} from ${MASKED_DEFAULT.baseBranch}`
    const drawn = `${priya.displayName ?? ''} continued on calummoore/checkout-[redacted]-v2-3f8d , a new branch from develop/[redacted]`
    expect([
      [
        shown(chat.controller, first).slice(-2),
        drawnNotes(chat.controller, first),
      ],
      [
        shown(replay.controller, first).slice(-2),
        drawnNotes(replay.controller, first),
      ],
    ]).toEqual([
      [[kept, 'user: Start the next task.'], [drawn]],
      [[kept, 'user: Start the next task.'], [drawn]],
    ])
  })

  it('copies each note by the labels of its branches, or by their real names when it has none, in both details', () => {
    const { document } = markdownFixture()
    const builder = new SessionMarkdown({
      ...document,
      session: {
        ...document.session,
        activeTurnId: null,
        activeTurnStartedAt: null,
      },
      commands: [],
    })
    builder.merge([
      { eventNumber: 1, occurredAt: 1, event: note(document.session.id) },
      {
        eventNumber: 2,
        occurredAt: 2,
        event: maskedNote(document.session.id, true),
      },
    ])
    const notes = (detail: TranscriptDetail) =>
      builder.render(detail).split('\n').slice(4)
    const copied = [
      '',
      `_${priya.displayName ?? ''} continued on \`${branch}\`, a new branch from \`main\`_`,
      '',
      `_${priya.displayName ?? ''} continued on \`calummoore/checkout-[redacted]-v2-3f8d\`, a new branch from \`develop/[redacted]\`_`,
      '',
    ]

    expect([notes('full'), notes('concise')]).toEqual([copied, copied])
  })
})
