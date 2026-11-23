// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, it } from 'vitest'
import { routes } from '../../app/router'
import type { ChatEvent } from '../../shared/chat-events'
import type { Workspace } from '../../shared/generated/Workspace'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { holdAnimationFrames, mount, waitFor } from '../../test-support/mount'
import { wakeNotice } from '../../test-support/recorded-wakes'
import { chatFor, shown } from '../state/test-kit'
import { WorkspaceChatView } from '../WorkspaceChat'
import { ended, said, turn, update } from './event-kit'
import { textOf } from './render-kit'

const { org, workspace: own, session } = FAKE_IDS
const fixtures = workspaceFixtures()
const { message } = fixtures
const next = { ...turn, turnId: 'turn-2' }

/** A workspace of the list of the org, which the chips of the chat find. */
function listed(workspaceId: string): Workspace {
  const found = fixtures.workspaces.workspaces.find(
    (item) => item.id === workspaceId,
  )
  if (!found) throw new Error(`The fake list has no workspace ${workspaceId}.`)
  return found
}

/** The start of the second turn, which takes the messages that it names. */
function startsNext(messageIds: readonly string[]): ChatEvent {
  return {
    ...next,
    type: 'turn.started',
    senderId: message.sender.id,
    choice: message.choice,
    startedAt: FAKE_TIME,
    messageIds,
  }
}

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

/**
 * Each wake line of the chat, found by its bell icon: its text, as a screen
 * reader hears it, whether a fold holds it, and the page that its chip opens.
 */
function wakeLines(root: HTMLElement) {
  return Array.from(root.querySelectorAll('.lucide-bell-ring'), (icon) => {
    const line = icon.parentElement
    return {
      text: line?.textContent ?? '',
      folded: line?.closest('details') !== null,
      opens: Array.from(line?.querySelectorAll('a') ?? [], (chip) =>
        chip.getAttribute('href'),
      ),
    }
  })
}

describe('the line of a wake', () => {
  it('names the end and the watched session with its chip at its place, starts a new part when it joins the turn, and never folds', async () => {
    holdAnimationFrames()
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    const { container } = await mount(
      <WorkspaceChatView controller={chat.controller} viewport="desktop" />,
    )
    await waitFor(
      () => chat.controller.workspaceList.workspaces.get(),
      'the workspace list that the chips find',
    )
    const joined = wakeNotice('debounce-watch', turn.turnId, 'finished')
    const cart = { workspaceId: 'fix-cart-flake', sessionId: 'debounce' }
    const reason = 'background_work_limit'
    const woke = wakeNotice('cart-watch', next.turnId, 'finished', cart, reason)
    const events: ChatEvent[] = [
      said('answer-2', 'The form now suggests addresses.'),
      joined,
      { ...turn, type: 'message.sent', messageId: joined.messageId },
      said('plan-3', 'I will read the session.'),
      update('read', 'conductive sessions read', 0),
      said('answer-3', 'Debounce passed its tests.'),
      ended('finished'),
      woke,
      startsNext([woke.messageId]),
      { ...update('read-cart', 'conductive sessions read', 0), ...next },
    ]
    act(() => {
      for (const event of events) chat.emit(event)
    })
    await waitFor(
      () =>
        chat.controller.sessionReads.getSnapshot()[cart.workspaceId]?.state ===
        'ready',
      'the read of the sessions of the other workspace',
    )
    const title = 'Debounce the address lookups to 250 ms'
    const ownChip = `W-${listed(own).number} Session ${title}, Ready to merge, Ready`
    const cartChip = `W-${listed(cart.workspaceId).number} Session ${title}, Checks running, Working`

    expect(wakeLines(container)).toEqual([
      {
        text: `A turn finished in ${ownChip}`,
        folded: false,
        opens: [routes.session(org, own, 'debounce')],
      },
      {
        text: `A turn finished in ${cartChip} · Background work stopped at the time limit`,
        folded: false,
        opens: [routes.session(org, cart.workspaceId, 'debounce')],
      },
    ])
    // Each line starts a part: the work before the answer of each part folds.
    expect(visible(container)).toContain(
      `${message.text} 1 tool call, 1 message The form now suggests addresses. A turn finished in`,
    )
    expect(visible(container)).toContain(
      'Ready 1 tool call, 1 message Debounce passed its tests. 4m 12s A turn finished in',
    )
  })

  it('stays with the turn that takes its hidden message, so a turn that ends before it takes it ends before the line', async () => {
    const chat = chatFor({ conversation: 'running' })
    await chat.controller.start()
    const notice = wakeNotice('debounce-watch', turn.turnId, 'stopped')
    chat.emit(notice)
    chat.emit(update('lint', 'npm run lint', 0))
    chat.emit(ended('finished'))
    // A continuation takes the message that the first turn did not answer.
    chat.emit(startsNext([notice.messageId]))
    chat.emit({ ...update('read', 'conductive sessions read', 0), ...next })

    expect(shown(chat.controller, session).slice(-5)).toEqual([
      'tool: src/app/checkout/AddressForm.tsx done',
      'tool: npm run lint done',
      'end: 252000',
      'wake: stopped in debounce',
      'tool: conductive sessions read done',
    ])
  })

  it('shows once at its place when its stored history loads, also when the stream repeats it and a new tab replays it', async () => {
    const chat = chatFor({ conversation: 'wake-during-turn' })
    await chat.controller.start()
    chat.emit(wakeNotice('debounce-watch', 'turn-3', 'finished'))
    const replay = chatFor({
      conversation: 'wake-during-turn',
      stream: chat.server.events,
    })
    await replay.controller.start()

    const tail = [
      'user: Add a test for an address without a postcode.',
      'tool: tests/checkout/address.test.ts done',
      'tool: npm test -- checkout done',
      'wake: finished in debounce',
      'tool: conductive sessions read running',
    ]
    expect([
      shown(chat.controller, session).slice(-5),
      shown(replay.controller, session).slice(-5),
    ]).toEqual([tail, tail])
  })
})
