// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import type { FakeApiServer } from '../../test-support/fake-api'
import { queryByText } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { popoverChatLabel } from '../../ui/components/explain/explainCopy'
import { layOutChat } from '../components/reading-place-test-kit'
import { mountChat } from './explain-test-kit'
import {
  explained,
  explanationAnswer,
  nextEvent,
  openFromMark,
} from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.restoreAllMocks()
})

const quote = 'Manual entry still works'
const title = `Explain "${quote}"`
const sessionId = 'explain-1'

/**
 * Lays out the chat of the popover with an answer of 300 px, more than its
 * box of 120 px from 100 px down, and 40 px for each other row.
 */
const layOutLongAnswer = () =>
  layOutChat({
    label: popoverChatLabel,
    rowHeight: (row) =>
      row.textContent?.includes(explanationAnswer) ? 300 : 40,
  })

/** Sends a later event of the workspace. */
const emit = (server: FakeApiServer, event: WorkspaceEvent) =>
  act(async () =>
    server.events.emit({
      workspaceId: FAKE_IDS.workspace,
      eventNumber: nextEvent(server),
      occurredAt: FAKE_TIME + 75_000,
      event,
    }),
  )

/** The end of a turn of the explanation that took `messageIds`. */
const ended = (
  turnId: string,
  messageIds: string[],
  durationMs: number,
): WorkspaceEvent => ({
  sessionId,
  turnId,
  type: 'turn.completed',
  state: 'finished',
  durationMs,
  userMessageIds: messageIds,
  files: [],
  omittedFileCount: 0,
})

/** A follow-up of the explanation, and its turn with a short answer. */
function shortTurn(text: string): WorkspaceEvent[] {
  const ask = workspaceFixtures().message
  const turnId = 'turn-follow-up'
  const message = { ...ask, id: 'follow-up', sessionId, text: 'And why?' }
  return [
    { type: 'message.accepted', message },
    {
      sessionId,
      turnId,
      type: 'turn.started',
      senderId: ask.sender.id,
      choice: ask.choice,
      startedAt: FAKE_TIME + 80_000,
      messageIds: [message.id],
    },
    {
      sessionId,
      turnId,
      type: 'assistant.completed',
      messageId: 'answer-follow-up',
      text,
      userMessageIds: [message.id],
    },
    ended(turnId, [message.id], 3_000),
  ]
}

describe('the answer in the popover of an explanation', () => {
  it('shows the top of a long answer when the popover opens on an ended turn', async () => {
    const { events } = explained(sessionId, quote)
    await mountChat({ stored: events })
    const chat = layOutLongAnswer()
    const popover = await openFromMark(title, 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer of the explanation',
    )
    expect(chat.topOf(chat.rowOf(explanationAnswer))).toBe(100)
  })

  it('shows the top of a long answer when its turn ends while the chat is at the bottom', async () => {
    const { events, prompt } = explained(sessionId, quote, { running: true })
    const { server } = await mountChat({ stored: events })
    const chat = layOutLongAnswer()
    const popover = await openFromMark(title, 'Working')
    const answer = chat.rowOf(explanationAnswer)
    expect(chat.scrollTop()).toBe(0)
    await emit(server, ended(`turn-${sessionId}`, [prompt.id], 14_000))
    await waitFor(() => queryByText('14s', popover), 'the end of the turn')
    expect(chat.topOf(answer)).toBe(100)
  })

  it('keeps the place of a reader higher up when the turn ends', async () => {
    const { events, prompt } = explained(sessionId, quote, { running: true })
    const { server } = await mountChat({ stored: events })
    const chat = layOutLongAnswer()
    const popover = await openFromMark(title, 'Working')
    const answer = chat.rowOf(explanationAnswer)
    chat.read(answer, 50)
    await emit(server, ended(`turn-${sessionId}`, [prompt.id], 14_000))
    await waitFor(() => queryByText('14s', popover), 'the end of the turn')
    expect(chat.topOf(answer)).toBe(50)
  })

  it('keeps the bottom for a newer answer that fits, under an older long answer', async () => {
    const { events } = explained(sessionId, quote)
    const { server } = await mountChat({ stored: events })
    const chat = layOutLongAnswer()
    const popover = await openFromMark(title, 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer of the explanation',
    )
    chat.readTheEnd()
    for (const event of shortTurn('It keeps the typed address.')) {
      await emit(server, event)
    }
    await waitFor(
      () => queryByText('It keeps the typed address.', popover),
      'the short answer',
    )
    await waitFor(() => queryByText('3s', popover), 'the end of the turn')
    expect(chat.scrollTop()).toBe(0)
  })
})
