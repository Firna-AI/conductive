// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import {
  byLabel,
  byText,
  queryAllByRole,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { asks, request } from '../../test-support/fixtures/secret-requests'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  anchorOf,
  answer,
  explanation,
  mountChat,
  readHighlights,
  recordEvent,
  textNodeWith,
} from './explain-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const ask = workspaceFixtures().message

/** The labels of the buttons at the ends of the marks, in their order. */
function markLabels(): string[] {
  return [...document.querySelectorAll('[aria-haspopup="dialog"]')].map(
    (button) => button.getAttribute('aria-label') ?? '',
  )
}

/** A second turn whose work folds a message of the agent before its answer. */
function secondTurn(): WorkspaceEvent[] {
  const turn = { sessionId: FAKE_IDS.session, turnId: 'turn-2' }
  return [
    {
      type: 'message.accepted',
      message: { ...ask, id: 'ask-2', text: 'Check the form again.' },
    },
    {
      ...turn,
      type: 'turn.started',
      senderId: ask.sender.id,
      choice: ask.choice,
      startedAt: FAKE_TIME + 1_000,
      messageIds: ['ask-2'],
    },
    {
      ...turn,
      type: 'assistant.completed',
      messageId: 'plan-2',
      text: 'I will read the form first.',
      userMessageIds: [],
    },
    {
      ...turn,
      type: 'tool.updated',
      tool: {
        id: 'read-again',
        kind: 'read',
        target: 'src/app/checkout/AddressForm.tsx',
        detail: null,
        omittedDetailBytes: 0,
        state: 'done',
      },
    },
    {
      ...turn,
      type: 'assistant.completed',
      messageId: 'answer-2',
      text: 'The form is fine.',
      userMessageIds: ['ask-2'],
    },
    {
      ...turn,
      type: 'turn.completed',
      state: 'finished',
      durationMs: 1_000,
      userMessageIds: ['ask-2'],
      files: [],
      omittedFileCount: 0,
    },
  ]
}

describe('the marks of explanations', () => {
  it('marks each quote with the state of its explanation', async () => {
    const highlights = readHighlights()
    const waiting = explanation('explain-wait', anchorOf('still works'), {
      activeTurnId: 'turn-wait',
      activeTurnStartedAt: FAKE_TIME,
    })
    const secret = request('secret-wait', asks.database, FAKE_TIME, {
      sessionId: waiting.id,
      turnId: 'turn-wait',
    })
    await mountChat({
      stored: [
        recordEvent(explanation('explain-idle', anchorOf('Manual entry'))),
        recordEvent(
          explanation('explain-run', anchorOf('checkout form'), {
            activeTurnId: 'turn-run',
          }),
        ),
        recordEvent(
          explanation('explain-failed', anchorOf('suggests'), {
            retryMessageId: 'prompt-failed',
          }),
        ),
        recordEvent(waiting),
        {
          type: 'secrets.request.updated',
          sessionId: waiting.id,
          request: secret,
        },
      ],
    })
    await waitFor(() => markLabels().length === 4, 'the four marks')
    expect({
      marks: markLabels(),
      highlights: highlights('mark'),
    }).toEqual({
      marks: [
        'Explain "checkout form", Working',
        'Explain "suggests", Failed',
        'Explain "Manual entry", Ready',
        'Explain "still works", Needs input',
      ],
      highlights: ['Manual entry', 'checkout form', 'suggests', 'still works'],
    })
  })

  it('covers the whole message with a mark whose text no longer matches, and a press on its text opens the popover', async () => {
    const highlights = readHighlights()
    const title = 'Explain "The postcode lookup still runs"'
    const stale = explanation(
      'explain-stale',
      anchorOf('The postcode lookup still runs', {
        before: 'Done. ',
        after: '',
      }),
    )
    await mountChat({ stored: [recordEvent(stale)] })
    await waitFor(
      () => queryByLabel(`${title}, Ready`),
      'the mark of the whole message',
    )
    const message = byText(answer.text, byLabel('Chat'))
    const shown = {
      title: message.closest('[title]')?.getAttribute('title'),
      highlights: highlights('mark'),
    }
    await press(message)
    expect({
      ...shown,
      popover: queryByRole('dialog', title) !== null,
    }).toEqual({ title, highlights: [], popover: true })
  })

  it('opens a menu of the explanations of overlapping marks in the order that they started', async () => {
    const highlights = readHighlights()
    const whole = explanation(
      'explain-whole',
      anchorOf('Manual entry still works'),
    )
    const inside = explanation('explain-inside', anchorOf('entry still'), {
      createdAt: whole.createdAt + 1_000,
    })
    await mountChat({ stored: [recordEvent(inside), recordEvent(whole)] })
    await waitFor(() => markLabels().length === 2, 'both marks')
    // The browser lays the line of the answer out over the press.
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([
      DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 20 }),
    ] as unknown as DOMRectList)
    const text = textNodeWith(byLabel('Chat'), 'entry still')
    act(() => {
      text.parentElement?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: 40, clientY: 10 }),
      )
    })
    const rows = await waitFor(() => {
      const found = queryAllByRole('menuitem', 'Explain "entry still"')
      return (
        found.length > 0 &&
        queryAllByRole('menuitem', 'Explain "Manual entry still works"')
      )
    }, 'the menu of the overlapping marks')
    const menu = rows[0]?.closest('[role="menu"]')
    expect({
      title: menu?.getAttribute('aria-label'),
      rows: [...(menu?.querySelectorAll('[role="menuitem"]') ?? [])].map(
        (row) => row.textContent,
      ),
      overlap: highlights('overlap'),
    }).toEqual({
      title: 'Explanations of this text',
      rows: ['Explain "Manual entry still works"', 'Explain "entry still"'],
      overlap: ['entry still'],
    })
    await press(
      queryAllByRole('menuitem', 'Explain "entry still"')[0] as HTMLElement,
    )
    expect({
      menu: queryByRole('menu', 'Explanations of this text'),
      open: queryByLabel('Explain "entry still", Ready')?.getAttribute(
        'aria-expanded',
      ),
    }).toEqual({ menu: null, open: 'true' })
  })

  it('shows a mark in the folded work of a turn when the fold and its message line open', async () => {
    const plan = explanation('explain-plan', {
      parentSessionId: FAKE_IDS.session,
      messageId: 'plan-2',
      quote: 'read the form',
      before: 'I will ',
      after: ' first.',
    })
    await mountChat({ stored: [...secondTurn(), recordEvent(plan)] })
    const fold = await waitFor(
      () => byText('1 tool call, 1 message'),
      'the folded work of the second turn',
    )
    const label = 'Explain "read the form", Ready'
    const closed = queryByLabel(label)
    await press(fold)
    await press(byText('I will read the form first.'))
    await waitFor(() => queryByLabel(label), 'the mark in the open line')
    expect(closed).toBeNull()
  })

  it('closes an open message line that a mark covers whole on a press on its text, and opens no popover', async () => {
    const title = 'Explain "check the tests"'
    const plan = explanation('explain-plan', {
      parentSessionId: FAKE_IDS.session,
      messageId: 'plan-2',
      quote: 'check the tests',
      before: 'I will ',
      after: ' first.',
    })
    await mountChat({ stored: [...secondTurn(), recordEvent(plan)] })
    await press(
      await waitFor(
        () => queryByText('1 tool call, 1 message'),
        'the folded work of the second turn',
      ),
    )
    const line = byText('I will read the form first.')
    await press(line)
    await waitFor(
      () => queryByLabel(`${title}, Ready`),
      'the mark that covers the open line',
    )
    await press(line)
    expect({
      open: line.closest('details')?.open,
      mark: queryByLabel(`${title}, Ready`),
      popover: queryByRole('dialog', title),
    }).toEqual({ open: false, mark: null, popover: null })
  })
})
