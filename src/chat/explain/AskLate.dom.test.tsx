// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import {
  focusMessage,
  messageText,
  pasteMessage,
} from '../../test-support/message-field'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import {
  answerStarts,
  settleReplies,
  startPromptIds,
  streamStart,
} from './ask-start-kit'
import { openAsk, question, questionField } from './ask-test-kit'
import { mountChat } from './explain-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const typedDuringWait = 'And on a phone?'
const failedTitle = "The explanation didn't start"

/** Opens the unsent popover, and sends the question. */
async function sendQuestion(): Promise<HTMLElement> {
  const popover = await openAsk()
  await typeText(questionField(popover), question)
  await press(byRole('button', 'Send', popover))
  return popover
}

/** The popover of the explanation that the Ask started, once it shows. */
function explainedPopover(): Promise<HTMLElement> {
  return waitFor(
    () => queryByRole('dialog', question),
    'the popover of the new explanation',
  )
}

/** The notice of a failed start in the parent chat, if it shows. */
function failedNotice(): HTMLElement | null {
  return queryByText(failedTitle, byLabel('Chat'))
}

describe('an Ask whose start shows in the stream before its reply', () => {
  it('settles once when the stream shows the start: the popover of the new explanation takes the text typed during the wait, and text typed in its tab before the late reply stays after it', async () => {
    const accepted = deferred()
    const reply = deferred()
    await mountChat({
      setup: (fake) =>
        answerStarts(fake, [
          {
            accepts: accepted.promise,
            replies: reply.promise,
            ends: 'started',
          },
        ]),
    })
    const popover = await sendQuestion()
    await typeText(questionField(popover), typedDuringWait)
    accepted.resolve()
    const explained = await explainedPopover()
    const followUp = messageText(byRole('textbox', 'Follow-up', explained))
    await press(byRole('button', question))
    // The member adds text at the end of the draft in the tab.
    const composer = byRole('textbox', 'Message')
    focusMessage(composer)
    pasteMessage(composer, ' And on a tablet?')
    reply.resolve()
    await settleReplies()
    expect({
      followUp,
      composer: messageText(byRole('textbox', 'Message')),
    }).toEqual({
      followUp: typedDuringWait,
      composer: `${typedDuringWait} And on a tablet?`,
    })
  })

  it('shows the popover of the new explanation, with no notice and no question, when the reply is a server error after the stream showed the start', async () => {
    await mountChat({
      setup: (fake) => answerStarts(fake, [{ ends: 'lost' }]),
    })
    await sendQuestion()
    const explained = await explainedPopover()
    await settleReplies()
    expect({
      popover: queryByRole('dialog', question) === explained,
      unsent: queryByRole('dialog', 'Ask'),
      notice: failedNotice(),
    }).toEqual({ popover: true, unsent: null, notice: null })
  })
})

describe('an Ask whose reply was lost', () => {
  it('settles when the stream shows the start after the failure: the notice and the question go, and the popover of the new explanation takes the text typed during the wait', async () => {
    const reply = deferred()
    const { server } = await mountChat({
      setup: (fake) =>
        answerStarts(fake, [{ accepts: reply.promise, ends: 'failed' }]),
    })
    const popover = await sendQuestion()
    await typeText(questionField(popover), typedDuringWait)
    reply.resolve()
    await waitFor(failedNotice, 'the notice of the failed start')
    const restored = messageText(questionField(byRole('dialog', 'Ask')))
    const [promptId = ''] = await startPromptIds(server)
    await act(async () => {
      streamStart(server, promptId)
    })
    const explained = await explainedPopover()
    expect({
      restored,
      notice: failedNotice(),
      unsent: queryByRole('dialog', 'Ask'),
      followUp: messageText(byRole('textbox', 'Follow-up', explained)),
    }).toEqual({
      restored: `${question}\n${typedDuringWait}`,
      notice: null,
      unsent: null,
      followUp: typedDuringWait,
    })
  })
})
