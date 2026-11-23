// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { answer, mountChat } from './explain-test-kit'
import { explained, explanationAnswer, openFromMark } from './popover-test-kit'
import { messageAttributes } from './selection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const title = 'Explain "Manual entry still works"'

/** Presses the pointer on `target`, as a mouse does before a click. */
async function pointerDown(target: EventTarget): Promise<void> {
  await act(async () => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
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
    expect({ kept, closed: queryByRole('dialog', title) }).toEqual({
      kept: true,
      closed: null,
    })
  })

  it('keeps the sheet of the popover on a phone', async () => {
    const { events } = explained('explain-1', 'Manual entry still works')
    await mountChat({ stored: events, viewport: 'mobile' })
    await openFromMark(title, 'Ready')
    await pointerDown(parentAnswer())
    expect(queryByRole('dialog', title)).not.toBeNull()
  })
})
