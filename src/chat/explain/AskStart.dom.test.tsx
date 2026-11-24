// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { messageText, pressInField } from '../../test-support/message-field'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import {
  answerStarts,
  askBody,
  askQuote,
  openAsk,
  question,
  questionField,
  selectQuote,
  startBodies,
} from './ask-test-kit'
import { mountChat, readHighlights } from './explain-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const typedDuringWait = 'And on a phone?'

describe('Ask by a selection', () => {
  it('opens the unsent popover with the quote kept and the field focused, keeps Send off for white space, and Send starts the explanation of the question', async () => {
    const highlights = readHighlights()
    const { server } = await mountChat({
      setup: (fake) => answerStarts(fake, [{ starts: true }]),
    })
    const ask = await selectQuote()
    const explain = byRole('button', 'Explain')
    const order = explain.compareDocumentPosition(ask)
    await press(ask)
    const popover = byRole('dialog', 'Ask')
    const field = questionField(popover)
    const opened = {
      focus: document.activeElement === field,
      quote: queryByText(`“${askQuote}”`, popover) !== null,
      expand: queryByRole('button', 'Expand', popover),
      kept: highlights('kept'),
      send: byRole('button', 'Send', popover).getAttribute('aria-disabled'),
    }
    await typeText(field, '   ')
    const blank = byRole('button', 'Send', popover).getAttribute(
      'aria-disabled',
    )
    await typeText(field, question)
    await press(byRole('button', 'Send', popover))
    const explained = await waitFor(
      () => queryByRole('dialog', question),
      'the popover of the new explanation',
    )
    expect({
      followsExplain: order === Node.DOCUMENT_POSITION_FOLLOWING,
      opened,
      blank,
      bodies: await startBodies(server),
      unsent: queryByRole('dialog', 'Ask'),
      mark: queryByLabel(`${question}, Working`) !== null,
      kept: highlights('kept'),
      prompt: explained.textContent?.includes('Keep the answer short.'),
      expand: queryByRole('button', 'Expand', explained) !== null,
    }).toEqual({
      followsExplain: true,
      opened: {
        focus: true,
        quote: true,
        expand: null,
        kept: [askQuote],
        send: 'true',
      },
      blank: 'true',
      bodies: [askBody],
      unsent: null,
      mark: true,
      kept: [],
      prompt: false,
      expand: true,
    })
  })

  it('empties the field at Send, keeps Send busy while the start waits, and gives the text typed during the wait to the follow-up field of the new explanation, with the focus', async () => {
    const reply = deferred()
    const { server } = await mountChat({
      setup: (fake) =>
        answerStarts(fake, [{ waits: reply.promise, starts: true }]),
    })
    const popover = await openAsk()
    await typeText(questionField(popover), question)
    await press(byRole('button', 'Send', popover))
    const field = questionField(popover)
    const sent = {
      field: messageText(field),
      focus: document.activeElement === field,
      busy: byRole('button', 'Send', popover).getAttribute('aria-busy'),
    }
    await typeText(field, typedDuringWait)
    // Enter while the start waits starts no second explanation.
    pressInField(field, 'Enter')
    reply.resolve()
    const explained = await waitFor(
      () => queryByRole('dialog', question),
      'the popover of the new explanation',
    )
    const followUp = byRole('textbox', 'Follow-up', explained)
    expect({
      sent,
      followUp: messageText(followUp),
      focus: document.activeElement === followUp,
      bodies: await startBodies(server),
    }).toEqual({
      sent: { field: '', focus: true, busy: 'true' },
      followUp: typedDuringWait,
      focus: true,
      bodies: [askBody],
    })
  })

  it('keeps the unsent popover after a failed start, with the question back before the text typed during the wait, its highlight, and the notice in the parent chat', async () => {
    const highlights = readHighlights()
    const reply = deferred()
    await mountChat({
      setup: (fake) =>
        answerStarts(fake, [{ waits: reply.promise, starts: false }]),
    })
    const popover = await openAsk()
    await typeText(questionField(popover), question)
    await press(byRole('button', 'Send', popover))
    await typeText(questionField(popover), typedDuringWait)
    reply.resolve()
    await waitFor(
      () => queryByText("The explanation didn't start", byLabel('Chat')),
      'the notice of the failed start in the parent chat',
    )
    const shown = queryByRole('dialog', 'Ask')
    const field = shown && queryByRole('textbox', 'Question', shown)
    const send = shown && queryByRole('button', 'Send', shown)
    expect({
      popover: shown === popover,
      field: field && messageText(field),
      send: send && send.getAttribute('aria-disabled'),
      kept: highlights('kept'),
    }).toEqual({
      popover: true,
      field: `${question}\n${typedDuringWait}`,
      send: null,
      kept: [askQuote],
    })
  })

  it('keeps the field of the question while the cloud computer is stopped, and Send starts the explanation', async () => {
    const { server } = await mountChat({
      workspaceState: 'stopped',
      setup: (fake) => answerStarts(fake, [{ starts: true }]),
    })
    const popover = await openAsk()
    expect({
      field: queryByRole('textbox', 'Question', popover) !== null,
      bar: queryByText('Sandbox stopped', popover),
      resume: queryByRole('button', 'Resume', popover),
    }).toEqual({ field: true, bar: null, resume: null })
    await typeText(questionField(popover), question)
    await press(byRole('button', 'Send', popover))
    await waitFor(
      () => queryByRole('dialog', question),
      'the popover of the new explanation',
    )
    expect(await startBodies(server)).toEqual([askBody])
  })
})
