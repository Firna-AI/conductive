import { describe, expect, it } from 'vitest'
import { wakeUpTexts } from '../../../docs/mockups/src/fixtures/wakeUps'
import { chatHistoryPath } from '../../shared/events'
import type { WakeUpEnd } from '../../shared/generated/WakeUpEnd'
import { sessionWakeUpPaths } from '../../shared/wake-up-paths'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { recordedChatEvents } from '../../test-support/recorded-chat'
import {
  wakeUpEnded,
  wakeUpScheduled,
  wakeUpTimes,
} from '../../test-support/recorded-wake-ups'
import { renderChat, sessionMarkup, textOf } from '../components/render-kit'
import type { ChatController } from '../state/controller'
import { chatFor, shown } from '../state/test-kit'
import { pendingWakeUps } from './wake-up-state'

const { org, workspace, session } = FAKE_IDS

/** The titles of the cards of the pending wake-ups, in the order of the chat. */
function cards(markup: string): string[] {
  return Array.from(
    markup.matchAll(/<section aria-label="(Wake-up [^"]*)"/g),
    (match) => match[1],
  )
}

/** The spoken names of the Cancel buttons of the cards. */
function cancels(markup: string): string[] {
  return Array.from(
    markup.matchAll(/aria-label="(Cancel the wake-up for [^"]*)"/g),
    (match) => match[1],
  )
}

/** The opening tag of the button with the spoken name `label`, or null. */
function buttonTag(markup: string, label: string): string | null {
  const tags = markup.match(/<button[^>]*>/g) ?? []
  return tags.find((tag) => tag.includes(`aria-label="${label}"`)) ?? null
}

/** The IDs of the pending wake-ups of the shown session, as its cards order them. */
const pendingIds = (controller: ChatController, sessionId = session) =>
  pendingWakeUps(controller.getSnapshot().wakeUps, sessionId).map(
    (wakeUp) => wakeUp.id,
  )

const byMember = (memberId: string): WakeUpEnd => ({
  kind: 'cancelled',
  source: { kind: 'member', memberId },
})

const cancelPath = sessionWakeUpPaths.cancel(org, workspace, session, 'preview')

const threeCards = [
  'Wake-up today at 18:30',
  'Wake-up tomorrow at 09:00',
  'Wake-up Mon 18 Jan at 09:00',
]

describe('the pending wake-ups of a session', () => {
  it('show at the top of the footer, the soonest first, from their read while an older page of the history still loads', async () => {
    // The newest page holds only the end of the turn that set the wake-ups.
    const newest = recordedChatEvents('wake-ups-pending').slice(-2)
    const { chat, markup } = await renderChat({
      conversation: 'wake-ups-pending',
      hold: (request) => new URL(request.url).searchParams.has('before'),
      setup: (server) =>
        server.json('GET', chatHistoryPath(org, workspace, session), {
          events: newest,
          throughEventNumber: newest[1].eventNumber,
          hasMore: true,
          nextBeforeEventNumber: newest[0].eventNumber,
        }),
    })
    const page = markup()
    expect([cards(page), cancels(page)]).toEqual([
      threeCards,
      [
        'Cancel the wake-up for today at 18:30',
        'Cancel the wake-up for tomorrow at 09:00',
        'Cancel the wake-up for Mon 18 Jan at 09:00',
      ],
    ])
    expect(textOf(page)).toContain(
      `Wake-up today at 18:30 Cancel ${wakeUpTexts.preview}`,
    )
    // Above the composer, after the last answer of the chat.
    const group = page.indexOf('aria-label="Pending wake-ups"')
    expect([
      page.indexOf('I set three wake-ups') < group,
      group < page.indexOf('Message the agent'),
    ]).toEqual([true, true])

    for (const release of chat.held) release()
    await chat.controller.readHistory(session)
    expect(cards(markup())).toEqual(threeCards)
  })

  it('follow the events of each open tab, once also when a loaded history repeats them', async () => {
    const chat = chatFor({ conversation: 'history' })
    await chat.controller.start()
    const other = chatFor({
      conversation: 'history',
      role: 'member',
      stream: chat.server.events,
    })
    await other.controller.start()
    chat.emit(
      wakeUpScheduled('checks', wakeUpTimes.tomorrow, 'Read the checks.'),
    )
    chat.emit(
      wakeUpScheduled('preview', wakeUpTimes.evening, 'Open the preview.'),
    )
    expect([pendingIds(chat.controller), pendingIds(other.controller)]).toEqual(
      [
        ['preview', 'checks'],
        ['preview', 'checks'],
      ],
    )

    // Try again of the history replays the set events of the session.
    await chat.controller.loadHistory(session)
    expect(pendingIds(chat.controller)).toEqual(['preview', 'checks'])

    chat.emit(wakeUpEnded('checks', wakeUpTimes.tomorrow, byMember('priya')))
    expect([pendingIds(chat.controller), pendingIds(other.controller)]).toEqual(
      [['preview'], ['preview']],
    )
  })

  it('end at the reply of a Cancel, and its end line shows once, also after a reload', async () => {
    const chat = chatFor({
      conversation: 'wake-up-cancelled',
      hold: (request) =>
        request.method === 'POST' &&
        new URL(request.url).pathname === cancelPath,
    })
    await chat.controller.start()
    // The reply comes before the stream brings the end.
    chat.server.json('POST', cancelPath, {
      eventNumber: chat.nextEventNumber() - 1,
      wakeUpId: 'preview',
      state: 'cancelled',
    })
    const cancelled = chat.controller.cancelWakeUp(session, 'preview')
    expect(pendingIds(chat.controller)).toEqual(['preview'])
    const cancel = 'Cancel the wake-up for today at 18:30'
    expect(buttonTag(sessionMarkup(chat.controller), cancel)).toContain(
      'aria-busy="true"',
    )
    for (const release of chat.held) release()
    await cancelled
    expect(pendingIds(chat.controller)).toEqual([])

    chat.emit(wakeUpEnded('preview', wakeUpTimes.evening, byMember('cal')))
    const line = 'You cancelled the wake-up for today at 18:30'
    const reload = chatFor({ server: chat.server })
    await reload.controller.start()
    expect([
      textOf(sessionMarkup(chat.controller)).split(line).length - 1,
      textOf(sessionMarkup(reload.controller)).split(line).length - 1,
      pendingIds(reload.controller),
      cards(sessionMarkup(reload.controller)),
    ]).toEqual([1, 1, [], []])
  })

  it.each([
    [
      'keeps the card and names the cause of a failed Cancel',
      503,
      { code: 'unavailable', message: 'The service is busy.' },
      ['preview'],
      { title: "The wake-up didn't cancel", message: 'The service is busy.' },
    ],
    [
      'ends the card with no notice when the session does not have the wake-up',
      404,
      { code: 'wake_up_not_found', message: 'The wake-up is not available.' },
      [],
      null,
    ],
  ])('%s', async (_name, status, error, pending, notice) => {
    const chat = chatFor({ conversation: 'wake-up-cancelled' })
    await chat.controller.start()
    chat.server.json('POST', cancelPath, { error }, status)
    await chat.controller.cancelWakeUp(session, 'preview')
    const snapshot = chat.controller.getSnapshot()
    const shown = snapshot.notice && {
      title: snapshot.notice.title,
      message: snapshot.notice.message,
    }
    expect([
      pendingIds(chat.controller),
      shown,
      snapshot.wakeUps.cancels,
    ]).toEqual([pending, notice, {}])
  })

  it('show in a read-only workspace with no Cancel', async () => {
    const { markup } = await renderChat({
      conversation: 'wake-ups-pending',
      workspaceState: 'archived',
    })
    expect([cards(markup()), cancels(markup())]).toEqual([threeCards, []])
  })
})

describe('the line of a fired wake-up', () => {
  it('shows once at its place in a loaded history, after Try again of the history, and in the replay of a new tab', async () => {
    const chat = chatFor({ conversation: 'wake-up-during-turn' })
    await chat.controller.start()
    await chat.controller.loadHistory(session)
    const replay = chatFor({
      conversation: 'wake-up-during-turn',
      stream: chat.server.events,
    })
    await replay.controller.start()
    const tail = [
      'user: Add a test for an address without a postcode.',
      'tool: tests/checkout/address.test.ts done',
      'tool: npm test -- checkout done',
      `wake-up: ${wakeUpTexts.checks}`,
      'tool: gh pr checks 482 running',
    ]
    expect([
      shown(chat.controller, session).slice(-5),
      shown(replay.controller, session).slice(-5),
      textOf(sessionMarkup(chat.controller)).split('Wake-up:').length - 1,
    ]).toEqual([tail, tail, 1])
  })
})

describe('the end line of a wake-up', () => {
  it('names the member of a Cancel, nobody for a member who left, and the session of a cancel through the workspace tools', async () => {
    const { text } = await renderChat({ conversation: 'wake-up-cancelled' })
    expect(text()).toContain(
      'Priya Raman cancelled the wake-up for tomorrow at 09:00',
    )
    expect(text()).toContain('Wake-up tomorrow at 00:30 · Cancelled from')
    expect(text()).toContain(
      'The wake-up for Mon 18 Jan at 09:00 was cancelled',
    )
  })

  it.each([
    ['admin', 'you connect Claude again'],
    ['member', 'Cal connects Claude again'],
  ] as const)(
    'names why a wake-up could not start, and the action for the %s who reads it',
    async (role, action) => {
      const { text } = await renderChat({
        conversation: 'wake-up-not-started',
        role,
      })
      for (const line of [
        'The wake-up for Wed 13 Jan at 09:00 could not start, because the workspace was archived.',
        `The wake-up for yesterday at 09:00 could not start. The agent can go on after ${action}.`,
        "The wake-up for yesterday at 18:30 could not start. The agent can go on after an admin connects Acme's Claude login again.",
        'The wake-up for today at 06:00 could not start. The agent can go on at the next message.',
        'The wake-up for today at 07:00 could not start, because the session was closed.',
      ]) {
        expect(text()).toContain(line)
      }
    },
  )
})
