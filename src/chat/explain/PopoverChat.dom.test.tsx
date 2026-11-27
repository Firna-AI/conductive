// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { answerStarts, streamComputerStart } from './ask-start-kit'
import { openAsk, question, questionField } from './ask-test-kit'
import { mountChat } from './explain-test-kit'
import {
  explained,
  explanationAnswer,
  explanationStart,
  openFromMark,
} from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.useRealTimers()
})

const quote = 'Manual entry still works'
const title = `Explain "${quote}"`

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

  it('gives no focus to a follow-up field that takes the place of the bar after the member moved the focus out of the popover', async () => {
    const { server } = await mountChat({
      workspaceState: 'stopped',
      setup: (fake) => answerStarts(fake, [{ ends: 'started' }]),
    })
    const popover = await openAsk()
    await typeText(questionField(popover), question)
    await press(byRole('button', 'Send', popover))
    const started = await waitFor(
      () => queryByRole('dialog', question),
      'the popover of the new explanation',
    )
    const chat = byRole('region', 'Chat')
    await act(async () => chat.focus())
    await act(async () => streamComputerStart(server))
    const followUp = await waitFor(
      () => queryByRole('textbox', 'Follow-up', started),
      'the follow-up field after the cloud computer starts',
    )
    expect({
      chat: document.activeElement === chat,
      field: document.activeElement === followUp,
    }).toEqual({ chat: true, field: false })
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
