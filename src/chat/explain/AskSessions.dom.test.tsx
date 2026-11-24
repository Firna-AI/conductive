// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { UserMessage } from '../../shared/generated/UserMessage'
import type { WorkspaceEvent } from '../../shared/events'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { messageText } from '../../test-support/message-field'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { answerStarts, settleReplies, type StartOutcome } from './ask-start-kit'
import { openAsk, question, questionField } from './ask-test-kit'
import {
  explanation,
  mountChat,
  recordEvent,
  selectText,
  textNodeWith,
} from './explain-test-kit'
import { openFromMark } from './popover-test-kit'
import { messageAttributes } from './selection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The other session of the recorded workspace, and the title of its tab. */
const other = {
  id: 'debounce',
  title: 'Debounce the address lookups to 250 ms',
}

/** A message of the member in the other session. */
const otherMessage: UserMessage = {
  ...workspaceFixtures().message,
  id: 'debounce-ask',
  sessionId: other.id,
  text: 'Debounce the address lookups to 250 ms.',
}

/** The title of an explanation of a quote of that message. */
const otherTitle = 'Explain "address lookups"'

/** The message and the explanation of the other session, in the history. */
const otherEvents: WorkspaceEvent[] = [
  { type: 'message.accepted', message: otherMessage },
  recordEvent(
    explanation('explain-debounce', {
      parentSessionId: other.id,
      messageId: otherMessage.id,
      quote: 'address lookups',
      before: 'Debounce the ',
      after: ' to 250 ms.',
    }),
  ),
]

const typedDuringWait = 'And on a phone?'

/** The chat with the other session, whose Ask waits for `outcome`. */
async function mountWithOther(outcome: StartOutcome) {
  return mountChat({
    stored: otherEvents,
    setup: (fake) => {
      answerStarts(fake, [outcome])
      answerStarts(fake, [{ ends: 'refused' }], other.id)
    },
  })
}

/** Sends a question, types during the wait, and shows the other session. */
async function askThenLeave(): Promise<void> {
  const popover = await openAsk()
  await typeText(questionField(popover), question)
  await press(byRole('button', 'Send', popover))
  await typeText(questionField(popover), typedDuringWait)
  await press(byRole('button', other.title))
}

/** Selects "Debounce" in the message of the other session, and gives `name`. */
async function selectInOther(name: 'Ask' | 'Explain'): Promise<HTMLElement> {
  const text = await waitFor(() => {
    const shown = document.querySelector(
      `[${messageAttributes.message}="${otherMessage.id}"]`,
    )
    return shown && textNodeWith(shown, 'Debounce')
  }, 'the message of the other session')
  await selectText(text, 'Debounce')
  return waitFor(() => queryByRole('button', name), `${name} by the selection`)
}

describe('an Ask while another session shows', () => {
  it('keeps the question of a start that failed there when a new Ask, a press on Explain, and a mark change the other session', async () => {
    const reply = deferred()
    await mountWithOther({ accepts: reply.promise, ends: 'refused' })
    await askThenLeave()
    reply.resolve()
    await settleReplies()
    await press(await selectInOther('Ask'))
    await typeText(questionField(byRole('dialog', 'Ask')), 'Why 250 ms?')
    await press(await selectInOther('Explain'))
    await settleReplies()
    await openFromMark(otherTitle, 'Ready')
    await press(byRole('button', 'Address autocomplete'))
    const back = await waitFor(
      () => queryByRole('dialog', 'Ask'),
      'the unsent popover of the failed start',
    )
    expect(messageText(questionField(back))).toBe(
      `${question}\n${typedDuringWait}`,
    )
  })

  it('keeps the popover that the member opened there when the start ends, and gives the text typed during the wait to the new explanation', async () => {
    const reply = deferred()
    await mountWithOther({ accepts: reply.promise, ends: 'started' })
    await askThenLeave()
    const opened = await openFromMark(otherTitle, 'Ready')
    reply.resolve()
    await waitFor(
      () => queryByRole('button', question),
      'the tab of the new explanation',
    )
    await settleReplies()
    const kept = queryByRole('dialog', otherTitle) === opened
    await press(byRole('button', 'Address autocomplete'))
    const explained = await openFromMark(question, 'Working')
    expect({
      kept,
      followUp: messageText(byRole('textbox', 'Follow-up', explained)),
    }).toEqual({ kept: true, followUp: typedDuringWait })
  })
})
