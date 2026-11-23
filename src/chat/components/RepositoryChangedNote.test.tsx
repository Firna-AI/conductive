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
  MASKED_DEFAULT,
  MASKED_MOVED,
} from '../../test-support/fixtures/masked-paths'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../test-support/fixtures/workspaces'
import { readEnvelope } from '../api/read-workspace'
import type { ChatController } from '../state/controller'
import { chatFor, shown } from '../state/test-kit'
import { textOf } from './render-kit'
import { ItemView } from './TranscriptItem'

const { org, workspace: ws, session: first } = FAKE_IDS
const branch = 'calummoore/checkout-address-autocomplete-v2-9c1e'
const repository = { id: 'billing-service', fullName: 'acme/billing-service' }
const priya = senderSnapshot(fakeUsers[1])
const noteLine = `repository changed by ${priya.githubLogin}: acme/billing-service on ${branch}`

function note(sessionId: string): WorkspaceEvent {
  return {
    type: 'workspace.repository-changed',
    sessionId,
    member: priya,
    repository,
    branch,
    baseBranch: 'main',
  }
}

/**
 * The note of a repository change whose new branch and the default branch
 * of the new repository hold the fake value of a secret. `labels` adds the
 * labels that the Worker sends beside the real names.
 */
function maskedNote(sessionId: string, labels: boolean): WorkspaceEvent {
  return {
    type: 'workspace.repository-changed',
    sessionId,
    member: priya,
    repository,
    branch: MASKED_MOVED.branch,
    baseBranch: MASKED_DEFAULT.baseBranch,
    ...(labels
      ? {
          displayBranch: MASKED_MOVED.displayBranch,
          displayBaseBranch: MASKED_DEFAULT.displayBaseBranch,
        }
      : {}),
  }
}

/** The text of each note of a session, as the chat draws it to a teammate. */
function drawnNotes(controller: ChatController, sessionId: string): string[] {
  const state = controller.getSnapshot().sessionStates[sessionId]
  return (state?.transcript.items ?? []).flatMap((item) =>
    item.kind === 'repository-changed'
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

describe('the note of a repository change', () => {
  it('reads the complete note from the stream', () => {
    const envelope = {
      workspaceId: ws,
      eventNumber: 9,
      occurredAt: 25,
      event: note(first),
    }
    expect(readEnvelope(envelope)).toEqual({ ...envelope, late: false })
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
        text: 'Start the billing task.',
      },
    })
    chat.emit(note(first))
    const replay = chatFor({ stream: chat.server.events })
    await replay.controller.start()

    expect([
      shown(chat.controller, first).slice(-2),
      shown(replay.controller, first).slice(-2),
    ]).toEqual([
      [noteLine, 'user: Start the billing task.'],
      [noteLine, 'user: Start the billing task.'],
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

  it('names the member who changed the repository, or You to that member, with the new repository and branch', () => {
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
              kind: 'repository-changed',
              id: `repository-changed:billing-service:${branch}`,
              member: priya,
              repository,
              branch,
            }}
            readers={{ viewerId, members: [] }}
          />,
        ),
      ).trim()

    expect([render(priya.id), render(fakeUsers[0].id)]).toEqual([
      `You moved the workspace to acme/billing-service , on the new branch ${branch}`,
      `${priya.displayName ?? ''} moved the workspace to acme/billing-service , on the new branch ${branch}`,
    ])
  })

  it('names the new branch by its label, once at its place for its real branch, also when a repeat brings the label and a new tab replays it', async () => {
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
        text: 'Start the billing task.',
      },
    })
    chat.emit(maskedNote(first, true))
    const replay = chatFor({ stream: chat.server.events })
    await replay.controller.start()

    // The test kit shows the real names that the note keeps.
    const kept = `repository changed by ${priya.githubLogin}: acme/billing-service on ${MASKED_MOVED.branch}`
    const drawn = `${priya.displayName ?? ''} moved the workspace to acme/billing-service , on the new branch calummoore/checkout-[redacted]-v2-9c1e`
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
      [[kept, 'user: Start the billing task.'], [drawn]],
      [[kept, 'user: Start the billing task.'], [drawn]],
    ])
  })

  it('copies each note with no heading, with the repository and the new branch as code, by the label of the branch, or by its real name when it has none, in both details', () => {
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
      {
        eventNumber: 1,
        occurredAt: 1,
        event: note(document.session.id),
      },
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
      `_${priya.displayName ?? ''} moved the workspace to \`acme/billing-service\`, on the new branch \`${branch}\`_`,
      '',
      `_${priya.displayName ?? ''} moved the workspace to \`acme/billing-service\`, on the new branch \`calummoore/checkout-[redacted]-v2-9c1e\`_`,
      '',
    ]

    expect([notes('full'), notes('concise')]).toEqual([copied, copied])
  })
})
