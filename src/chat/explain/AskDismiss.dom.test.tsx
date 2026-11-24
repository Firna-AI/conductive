// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { messageText } from '../../test-support/message-field'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { answerStarts, startBodies, startPromptIds } from './ask-start-kit'
import {
  askBody,
  openAsk,
  parentAnswer,
  pointerDown,
  question,
  questionField,
  selectQuote,
} from './ask-test-kit'
import { mountChat, readHighlights } from './explain-test-kit'
import { explained, openFromMark } from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The title of the other session of the recorded workspace. */
const otherSession = 'Debounce the address lookups to 250 ms'

/** Opens the unsent popover and writes the question in it. */
async function openWithQuestion(): Promise<HTMLElement> {
  const popover = await openAsk()
  await typeText(questionField(popover), question)
  return popover
}

describe('a close of the unsent popover', () => {
  it('drops the question and starts nothing at Escape, at a press outside, which moves no focus, when a mark opens its popover in its place, and at a change of the shown session', async () => {
    const highlights = readHighlights()
    const other = explained('explain-1', 'checkout form')
    const { server } = await mountChat({ stored: other.events })
    await openWithQuestion()
    await pressKey('Escape')
    const escaped = {
      popover: queryByRole('dialog', 'Ask'),
      kept: highlights('kept'),
      focus: document.activeElement === byRole('region', 'Chat'),
    }
    const reopened = messageText(questionField(await openAsk()))
    await typeText(questionField(byRole('dialog', 'Ask')), question)
    await pointerDown(parentAnswer())
    const outside = {
      popover: queryByRole('dialog', 'Ask'),
      focus: document.activeElement === byRole('region', 'Chat'),
    }
    await openWithQuestion()
    await openFromMark('Explain "checkout form"', 'Ready')
    const replaced = queryByRole('dialog', 'Ask')
    await openWithQuestion()
    await press(byRole('button', otherSession))
    await press(byRole('button', 'Address autocomplete'))
    expect({
      escaped,
      reopened,
      outside,
      replaced,
      session: queryByRole('dialog', 'Ask'),
      bodies: await startBodies(server),
    }).toEqual({
      escaped: { popover: null, kept: [], focus: true },
      reopened: '',
      outside: { popover: null, focus: false },
      replaced: null,
      session: null,
      bodies: [],
    })
  })

  it('stops nothing while the start waits: a failed start opens the unsent popover again with the question, its Send is the same start again, and a start opens the popover of the new explanation', async () => {
    const failing = deferred()
    const starting = deferred()
    const { server } = await mountChat({
      setup: (fake) =>
        answerStarts(fake, [
          { accepts: failing.promise, ends: 'failed' },
          { accepts: starting.promise, ends: 'started' },
        ]),
    })
    const popover = await openWithQuestion()
    await press(byRole('button', 'Send', popover))
    await pressKey('Escape')
    const closed = queryByRole('dialog', 'Ask')
    failing.resolve()
    const again = await waitFor(
      () => queryByRole('dialog', 'Ask'),
      'the unsent popover after the failed start',
    )
    const field = messageText(questionField(again))
    await press(byRole('button', 'Send', again))
    await press(byRole('button', 'Close', again))
    const closedAgain = queryByRole('dialog', 'Ask')
    starting.resolve()
    const shown = await waitFor(
      () => queryByRole('dialog', question),
      'the popover of the new explanation',
    )
    expect({
      closed,
      field,
      closedAgain,
      focus: document.activeElement === shown,
      bodies: await startBodies(server),
      // A server error can come after the start, so the Send of the same
      // question names the same written prompt.
      prompts: new Set(await startPromptIds(server)).size,
    }).toEqual({
      closed: null,
      field: question,
      closedAgain: null,
      focus: true,
      bodies: [askBody, askBody],
      prompts: 1,
    })
  })

  it('opens Ask from the bar above the composer on a phone, as a sheet that a press outside keeps', async () => {
    await mountChat({ viewport: 'mobile' })
    const ask = await selectQuote()
    const inMessage = parentAnswer().contains(ask)
    await press(ask)
    const popover = byRole('dialog', 'Ask')
    const focus = document.activeElement === questionField(popover)
    await pointerDown(parentAnswer())
    expect({
      inMessage,
      focus,
      kept: queryByRole('dialog', 'Ask') === popover,
    }).toEqual({ inMessage: false, focus: true, kept: true })
  })
})
