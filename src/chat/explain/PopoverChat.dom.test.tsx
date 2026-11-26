// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryByRole, queryByText } from '../../test-support/dom-queries'
import {
  asks,
  late,
  request,
} from '../../test-support/fixtures/secret-requests'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
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

  it('shows a late request of the explanation in the stack above its follow-up field, as a tab does', async () => {
    const { events } = explained('explain-1', quote)
    const asked = request('explain-late', asks.database, explanationStart, {
      ...late(explanationStart + 90_000),
      sessionId: 'explain-1',
      turnId: 'turn-explain-1',
    })
    await mountChat({
      stored: [
        ...events,
        {
          type: 'secrets.request.updated',
          sessionId: 'explain-1',
          request: asked,
        },
      ],
    })
    const popover = await openFromMark(title, 'Needs input')
    const stack = await waitFor(
      () => queryByRole('group', 'Requests that wait for an answer', popover),
      'the stack of the popover',
    )
    expect({
      card: stack
        .querySelector('section[aria-label]')
        ?.getAttribute('aria-label'),
      field: queryByRole('textbox', 'Follow-up', popover) !== null,
    }).toEqual({ card: 'Request for PROD_DATABASE_URL', field: true })
  })
})
