// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  byLabel,
  byRole,
  queryAllByRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import {
  anchorOf,
  answer,
  explanation,
  mountChat,
  recordEvent,
  textNodeWith,
} from './explain-test-kit'
import { explained, explanationAnswer, openFromMark } from './popover-test-kit'
import { messageAttributes } from './selection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const title = 'Explain "Manual entry still works"'

/** Presses the pointer on `target` at a point, as a mouse does. */
async function pointerDown(
  target: EventTarget,
  at = { clientX: 0, clientY: 0 },
): Promise<void> {
  await act(async () => {
    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, ...at }),
    )
  })
}

/** The element of the recorded answer in the parent chat. */
function parentAnswer(): HTMLElement {
  const element = document.querySelector<HTMLElement>(
    `[${messageAttributes.message}="${answer.messageId}"]`,
  )
  if (!element) throw new Error('The chat shows no recorded answer.')
  return element
}

describe('a press outside the popover of an explanation', () => {
  it('closes the popover on a computer, and a press in the popover or on its mark keeps it', async () => {
    const { events } = explained('explain-1', 'Manual entry still works')
    await mountChat({ stored: events })
    const popover = await openFromMark(title, 'Ready')
    const answerText = await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer of the explanation',
    )
    await pointerDown(answerText)
    await pointerDown(byRole('button', `${title}, Ready`))
    const kept = queryByRole('dialog', title) !== null
    await pointerDown(parentAnswer())
    // Plain text takes no focus, so a close that moved the focus to the
    // mark would show here.
    expect({
      kept,
      closed: queryByRole('dialog', title),
      focus: document.activeElement === document.body,
    }).toEqual({ kept: true, closed: null, focus: true })
  })

  it('keeps the popover at a press on the text of overlapping marks and in their menu', async () => {
    const { events, record } = explained(
      'explain-1',
      'Manual entry still works',
    )
    const inside = explanation('explain-inside', anchorOf('entry still'), {
      createdAt: record.createdAt + 1_000,
    })
    await mountChat({ stored: [...events, recordEvent(inside)] })
    const popover = await openFromMark(title, 'Ready')
    // The browser lays the line of the answer out over the press.
    const lines = vi
      .spyOn(Range.prototype, 'getClientRects')
      .mockReturnValue([
        DOMRect.fromRect({ x: 0, y: 0, width: 800, height: 20 }),
      ] as unknown as DOMRectList)
    const text = textNodeWith(byLabel('Chat'), 'entry still').parentElement
    if (!text) throw new Error('The answer has no text of the marks.')
    const at = { clientX: 40, clientY: 10 }
    await pointerDown(text, at)
    const pressed = queryByRole('dialog', title) === popover
    act(() => {
      text.dispatchEvent(new MouseEvent('click', { bubbles: true, ...at }))
    })
    const [row] = await waitFor(() => {
      const found = queryAllByRole('menuitem', 'Explain "entry still"')
      return found.length > 0 && found
    }, 'the menu of the overlapping marks')
    const menu = row?.closest('[role="menu"]')
    if (!row || !menu) throw new Error('The menu has no row.')
    await pointerDown(menu)
    await pointerDown(row)
    expect({
      pressed,
      menu: queryByRole('dialog', title) === popover,
    }).toEqual({ pressed: true, menu: true })
    lines.mockRestore()
  })

  it('keeps the sheet of the popover on a phone', async () => {
    const { events } = explained('explain-1', 'Manual entry still works')
    await mountChat({ stored: events, viewport: 'mobile' })
    await openFromMark(title, 'Ready')
    await pointerDown(parentAnswer())
    expect(queryByRole('dialog', title)).not.toBeNull()
  })
})
