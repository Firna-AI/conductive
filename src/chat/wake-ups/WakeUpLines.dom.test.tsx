// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/router'
import type { ChatEvent } from '../../shared/chat-events'
import { sessionWakeUpPaths } from '../../shared/wake-up-paths'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import {
  wakeUpFired,
  wakeUpScheduled,
  wakeUpTimes,
} from '../../test-support/recorded-wake-ups'
import { ended, said, turn, update } from '../components/event-kit'
import { textOf } from '../components/render-kit'
import { chatFor } from '../state/test-kit'
import type { Clock } from '../ui/clock'
import { WorkspaceChatView } from '../WorkspaceChat'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace, session } = FAKE_IDS

/** The reader's clock: the fake time, in UTC. */
const clock: Clock = { now: () => FAKE_TIME, timeZone: 'UTC' }

/** The text that a person sees: a closed fold shows only its line. */
function visible(root: HTMLElement): string {
  const page = document.createElement('div')
  page.innerHTML = root.innerHTML
  for (const fold of page.querySelectorAll('details:not([open])')) {
    for (const part of Array.from(fold.children)) {
      if (part.tagName !== 'SUMMARY') part.remove()
    }
  }
  return textOf(page.innerHTML)
}

const count = (text: string, part: string) => text.split(part).length - 1

describe('the line of a wake-up', () => {
  it('joins the running turn as a new part, starts the next turn, and never folds', async () => {
    holdAnimationFrames()
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    const { container } = await mount(
      <WorkspaceChatView
        clock={clock}
        controller={chat.controller}
        viewport="desktop"
      />,
    )
    const next = { sessionId: session, turnId: 'turn-2' }
    const joins = wakeUpFired('checks', turn.turnId, 'Read the checks of #482.')
    const starts = wakeUpFired('preview', next.turnId, 'Open the preview.')
    const events: ChatEvent[] = [
      wakeUpScheduled(
        'checks',
        wakeUpTimes.tomorrow,
        'Read the checks of #482.',
      ),
      wakeUpScheduled('preview', wakeUpTimes.evening, 'Open the preview.'),
      joins,
      { ...turn, type: 'message.sent', messageId: joins.messageId },
      update('checks-read', 'gh pr checks 482', 0),
      said('checks-answer', 'The checks of #482 passed.'),
      ended('finished'),
      starts,
      {
        ...next,
        type: 'turn.started',
        senderId: 'cal',
        choice: chat.controller.getSnapshot().sessions[0].choice,
        startedAt: FAKE_TIME,
        messageIds: [starts.messageId],
      },
      { ...update('preview', 'npm run preview', 0, 'running'), ...next },
    ]
    act(() => {
      for (const event of events) chat.emit(event)
    })
    // The stream sends the line that started the turn again.
    const sent = chat.server.events.history().events.at(-3)
    if (!sent) throw new Error('The fake has no event to send again.')
    act(() => chat.server.events.publish(sent))

    // The answer before the line stays in view, and the work after it
    // folds on its own, before its own answer.
    const text = visible(container)
    expect(text).toContain(
      'I will check the checkout form. 1 tool call Wake-up: Read the checks of #482. 1 tool call The checks of #482 passed. 4m 12s Wake-up: Open the preview.',
    )
    expect(count(text, 'Wake-up:')).toBe(2)
  })
})

describe('Cancel on a card of a pending wake-up', () => {
  it('waits for its reply with no question, then the card goes and the line names the member', async () => {
    holdAnimationFrames()
    const path = sessionWakeUpPaths.cancel(org, workspace, session, 'preview')
    const chat = chatFor({
      conversation: 'wake-up-cancelled',
      hold: (request) =>
        request.method === 'POST' && new URL(request.url).pathname === path,
    })
    await chat.controller.start()
    const { container } = await mount(
      <WorkspaceChatView
        clock={clock}
        controller={chat.controller}
        viewport="desktop"
      />,
    )
    const name = 'Cancel the wake-up for today at 18:30'
    const cancel = await waitFor(() => queryByRole('button', name), 'Cancel')
    await press(cancel)
    await waitFor(
      () => cancel.getAttribute('aria-busy') === 'true',
      'a busy Cancel',
    )
    expect(queryByText('Wake-up today at 18:30')).not.toBeNull()

    for (const release of chat.held) release()
    await waitFor(
      () => queryByRole('button', name) === null,
      'the end of the card',
    )
    await waitFor(
      () => chat.controller.workspaceList.workspaces.get(),
      'the workspace list that the chips find',
    )
    const text = visible(container)
    expect(count(text, 'You cancelled the wake-up for today at 18:30')).toBe(1)
    // The cancel of an agent names its session with the chip that opens it.
    const from = Array.from(container.querySelectorAll('a')).filter((link) =>
      link
        .closest('p')
        ?.textContent?.startsWith('Wake-up tomorrow at 00:30 · Cancelled from'),
    )
    expect(from.map((link) => link.getAttribute('href'))).toEqual([
      routes.session(org, workspace, 'debounce'),
    ])
  })
})
