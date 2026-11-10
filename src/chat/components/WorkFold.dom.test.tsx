// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import type { ChatEvent } from '../../shared/chat-events'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import type { chatFor } from '../state/test-kit'
import { ended, refused, said, turn, update } from './event-kit'
import { renderChat, textOf } from './render-kit'

const { message } = workspaceFixtures()
const asked = message.text

/** The rendered chat as a page that the test can read. */
function pageOf(markup: string): HTMLElement {
  const page = document.createElement('div')
  page.innerHTML = markup
  return page
}

/** The text that a person sees: a closed fold shows only its line. */
function seen(markup: string): string {
  const page = pageOf(markup)
  for (const fold of page.querySelectorAll('details:not([open])')) {
    for (const part of Array.from(fold.children)) {
      if (part.tagName !== 'SUMMARY') part.remove()
    }
  }
  return textOf(page.innerHTML)
}

const textIn = (element: Element | null) =>
  textOf(element?.innerHTML ?? '').trim()

/** Each fold of the chat: the words of its line, and the text of each step. */
function folds(markup: string) {
  return Array.from(pageOf(markup).querySelectorAll('details'))
    .filter((fold) => fold.parentElement?.closest('details') === null)
    .map((fold) => ({
      line: textIn(fold.querySelector(':scope > summary')),
      steps: Array.from(fold.querySelectorAll(':scope > ul > li'), textIn),
    }))
}

/** Sends an event that the workspace took 10 seconds after the turn began. */
function emitLater(chat: ReturnType<typeof chatFor>, event: ChatEvent) {
  chat.server.events.emit({
    workspaceId: FAKE_IDS.workspace,
    eventNumber: chat.nextEventNumber(),
    occurredAt: FAKE_TIME + 10_000,
    event,
  })
}

describe('the work of a turn', () => {
  it('keeps the work of a running turn in view, and folds it before the answer when the turn finishes', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    chat.emit(update('lint', 'npm run lint', 0))
    chat.emit(said('answer-2', 'The form now suggests addresses.'))
    expect(seen(markup())).toContain(
      `${asked} I will check the checkout form. 2 tool calls The form now suggests addresses. Working 2m 41s`,
    )

    chat.emit(ended('finished'))
    expect(seen(markup())).toContain(
      `${asked} 2 tool calls, 1 message The form now suggests addresses. 4m 12s`,
    )
    expect(folds(markup())).toEqual([
      {
        line: '2 tool calls, 1 message',
        steps: [
          'I will check the checkout form.',
          'Read src/app/checkout/AddressForm.tsx',
          'Ran npm run lint',
        ],
      },
    ])
  })

  it('keeps the newest run of a running turn open between its calls and while a message waits, and folds it when the turn ends', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    const read = 'Read src/app/checkout/AddressForm.tsx'
    // The recorded read is done, and the agent has not started a new call.
    expect(seen(markup())).toContain(
      `I will check the checkout form. 1 tool call ${read} Working 2m 41s`,
    )

    chat.emit(update('lint', 'npm run lint', 0, 'running'))
    chat.emit(update('lint', 'npm run lint', 0))
    // The agent reads a message that waits at its next call.
    const steer = { ...message, id: 'steer-1', text: 'Also debounce it.' }
    chat.emit({ type: 'message.accepted', message: steer })
    expect(seen(markup())).toContain(
      `2 tool calls ${read} Ran npm run lint ${steer.text} Working 2m 41s`,
    )

    chat.emit(ended('finished'))
    expect(seen(markup())).toContain(
      'I will check the checkout form. 2 tool calls 4m 12s',
    )
  })

  it('keeps the last message of a stopped turn and the calls that the stop cut off in view', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    chat.emit(said('answer-2', 'Next I will run the tests.'))
    chat.emit(update('unit', 'npm test', 0, 'running'))
    chat.emit({
      ...turn,
      type: 'turn.stop-requested',
      requestedById: message.sender.id,
    })
    chat.emit(ended('stopped'))
    expect(seen(markup())).toContain(
      `${asked} 1 tool call, 1 message Next I will run the tests. 1 tool call Ran npm test Stopped You stopped the agent`,
    )
  })

  it('starts a new part at a message sent during the turn, and keeps the answer of each part in view', async () => {
    const { chat, markup } = await renderChat({ conversation: 'running' })
    const steer = {
      ...message,
      id: 'steer-1',
      text: 'Also debounce the lookups to 250 ms.',
    }
    chat.emit(said('answer-2', 'The form now suggests addresses.'))
    chat.emit({ type: 'message.accepted', message: steer })
    chat.emit({ ...turn, type: 'message.sent', messageId: steer.id })
    chat.emit(said('plan-3', 'I will add the debounce to the hook.'))
    chat.emit(update('debounce', 'npm test -- debounce', 0))
    chat.emit(said('answer-3', 'Each lookup now waits 250 ms.'))
    chat.emit(ended('finished'))
    expect(seen(markup())).toContain(
      `${asked} 1 tool call, 1 message The form now suggests addresses. ${steer.text} 1 tool call, 1 message Each lookup now waits 250 ms. 4m 12s`,
    )
  })

  it('keeps the agent messages at the end of a turn in view, up to a card between two of them', async () => {
    const both = await renderChat({ conversation: 'running' })
    both.chat.emit(said('answer-2', 'The form now suggests addresses.'))
    both.chat.emit(said('answer-3', 'Manual entry still works.'))
    both.chat.emit(ended('finished'))
    expect(seen(both.markup())).toContain(
      `${asked} 1 tool call, 1 message The form now suggests addresses. Manual entry still works. 4m 12s`,
    )

    // The command started before the last message, so its card goes between.
    const split = await renderChat({
      conversation: 'running',
      macCommands: 'done',
    })
    split.chat.emit(said('answer-2', 'I asked to run the test on your Mac.'))
    emitLater(
      split.chat,
      said('answer-3', 'The checkout test passes in Safari.'),
    )
    split.chat.emit(ended('finished'))
    expect(seen(split.markup())).toContain(
      `${asked} 1 tool call, 2 messages The checkout test passes in Safari. 4m 12s`,
    )
    expect(folds(split.markup())[0].steps.slice(2)).toEqual([
      'I asked to run the test on your Mac.',
      expect.stringContaining("Cal's MacBook Pro Done in 16s"),
    ])
  })

  it('folds a card and a lost line of the turn at their place, and keeps a lost line in view alone or of no turn', async () => {
    const { chat, markup } = await renderChat({
      conversation: 'running',
      macCommands: 'done',
    })
    chat.emit(refused(12, 'tool.updated', 'too_large'))
    emitLater(chat, said('answer-2', 'The checkout test passes in Safari.'))
    chat.emit(ended('finished'))
    const next = { ...message, id: 'ask-2', text: 'Run the whole suite.' }
    const second = { ...turn, turnId: 'turn-2' }
    chat.emit({ type: 'message.accepted', message: next })
    chat.emit({
      ...second,
      type: 'turn.started',
      senderId: message.sender.id,
      choice: message.choice,
      startedAt: FAKE_TIME,
      messageIds: [next.id],
    })
    chat.emit(refused(20, 'tool.updated', 'too_large', second))
    chat.emit(refused(21, 'assistant.delta', 'invalid', { turnId: null }))
    chat.emit({ ...update('suite', 'npm test', 0), ...second })
    chat.emit(said('answer-3', 'All 312 tests pass.', second.turnId))
    chat.emit(ended('finished', second.turnId))

    const tooLarge = 'A tool update was lost because it was too large'
    const unread =
      'Part of a reply from the agent was lost because it could not be read'
    expect(seen(markup())).toContain(
      `${asked} 1 tool call, 1 message The checkout test passes in Safari. 4m 12s ${next.text} ${tooLarge} ${unread} 1 tool call All 312 tests pass. 4m 12s`,
    )
    expect(folds(markup())).toEqual([
      {
        line: '1 tool call, 1 message',
        steps: [
          'I will check the checkout form.',
          'Read src/app/checkout/AddressForm.tsx',
          tooLarge,
          expect.stringContaining("Cal's MacBook Pro Done in 16s"),
        ],
      },
      { line: '1 tool call', steps: ['Ran npm test'] },
    ])
  })
})
