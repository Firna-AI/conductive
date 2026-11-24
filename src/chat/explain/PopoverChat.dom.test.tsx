// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { popoverChatLabel } from '../../ui/components/explain/explainCopy'
import { layOutChat } from '../components/reading-place-test-kit'
import { mountChat } from './explain-test-kit'
import {
  explained,
  explanationAnswer,
  explanationStart,
  nextEvent,
  openFromMark,
} from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const quote = 'Manual entry still works'
const title = `Explain "${quote}"`

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

describe('the chat of the popover of an explanation', () => {
  it('shows the bar of a stopped cloud computer in place of the follow-up field, as a tab does', async () => {
    const { events } = explained('explain-1', quote)
    await mountChat({ stored: events, workspaceState: 'stopped' })
    const popover = await openFromMark(title, 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer of the explanation',
    )
    expect({
      bar: queryByText('Sandbox stopped', popover) !== null,
      resume: queryByRole('button', 'Resume', popover) !== null,
      field: queryByRole('textbox', 'Follow-up', popover),
    }).toEqual({ bar: true, resume: true, field: null })
  })

  it('shows the top of a long answer when the popover opens on an ended turn', async () => {
    const { events } = explained('explain-1', quote)
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
    const { events, prompt } = explained('explain-1', quote, { running: true })
    const { server } = await mountChat({ stored: events })
    const chat = layOutLongAnswer()
    const popover = await openFromMark(title, 'Working')
    const answer = chat.rowOf(explanationAnswer)
    expect(chat.scrollTop()).toBe(0)
    await act(async () =>
      server.events.emit({
        workspaceId: FAKE_IDS.workspace,
        eventNumber: nextEvent(server),
        occurredAt: FAKE_TIME + 75_000,
        event: {
          sessionId: 'explain-1',
          turnId: 'turn-explain-1',
          type: 'turn.completed',
          state: 'finished',
          durationMs: 14_000,
          userMessageIds: [prompt.id],
          files: [],
          omittedFileCount: 0,
        },
      }),
    )
    await waitFor(() => queryByText('14s', popover), 'the end of the turn')
    expect(chat.topOf(answer)).toBe(100)
  })

  it('moves the time of a running explanation on while its parent session is idle', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let time = explanationStart + 5_000
    const { events } = explained('explain-1', quote, { running: true })
    await mountChat({ stored: events, clock: { now: () => time } })
    const popover = await openFromMark(title, 'Working')
    const elapsed = await waitFor(
      () => queryByText('5s', popover),
      'the time of the running turn',
    )
    time += 60_000
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    expect(elapsed.textContent).toBe('1m 5s')
  })
})
