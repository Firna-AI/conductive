// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '../../shared/generated/Session'
import type { SendMessageResponse } from '../../shared/messages'
import { retryMessagePath, sessionPaths } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { messageText } from '../../test-support/message-field'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { mountChat } from './explain-test-kit'
import {
  explained,
  explanationAnswer,
  followUpReply,
  linkedFrom,
  nextEvent,
  openFromMark,
  sendFollowUp,
} from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const quote = 'Manual entry still works'
const title = `Explain "${quote}"`
const followUp = 'And on a phone?'

/**
 * Answers each follow-up of `source` as the Worker does when the login of
 * `source` cannot take it: `linked` takes the message. The reply waits
 * until `waits` settles.
 */
function opensLinked(
  fake: FakeApiServer,
  source: Session,
  linked: Session,
  waits: Promise<void>,
): void {
  fake.handle(
    'POST',
    sessionPaths.messages(org, workspace, source.id),
    async (request) => {
      await waits
      const reply = await followUpReply(request, linked, nextEvent(fake))
      return Response.json(reply, { status: 202 })
    },
  )
}

/** The text of the row of tabs, and the title of the shown tab. */
function tabs(): { row: string; shown: string | null | undefined } {
  const row = byLabel('Sessions and files')
  return {
    row: row.textContent ?? '',
    shown: row.querySelector('[aria-current="page"]')?.textContent,
  }
}

describe('the popover of an explanation and a linked session', () => {
  it('shows the linked session of a follow-up with the text that the member typed while the reply waited', async () => {
    const { events, record } = explained('explain-1', quote)
    const reply = deferred()
    await mountChat({
      stored: events,
      setup: (fake) =>
        opensLinked(fake, record, linkedFrom(record, followUp), reply.promise),
    })
    const popover = await openFromMark(title, 'Ready')
    await sendFollowUp(popover, followUp)
    await typeText(byRole('textbox', 'Follow-up', popover), 'And on a tablet?')
    reply.resolve()
    await waitFor(
      () => queryByRole('button', title, popover),
      'the line of the linked session',
    )
    expect({
      field: messageText(byRole('textbox', 'Follow-up', popover)),
      shown: tabs().shown,
    }).toEqual({ field: 'And on a tablet?', shown: 'Address autocomplete' })
  })

  it('shows the linked session that takes Try again of a failed turn', async () => {
    const { events, record, prompt } = explained('explain-1', quote, {
      failed: true,
    })
    const linked = linkedFrom(record, 'Why manual entry works')
    await mountChat({
      stored: events,
      setup: (fake) =>
        fake.handle(
          'POST',
          retryMessagePath(org, workspace, record.id, prompt.id),
          async () => {
            const reply: SendMessageResponse = {
              eventNumber: nextEvent(fake),
              session: linked,
              turnId: null,
              message: { ...prompt, id: 'retry-1', sessionId: linked.id },
            }
            return Response.json(reply, { status: 202 })
          },
        ),
    })
    const popover = await openFromMark(title, 'Failed')
    const tryAgain = await waitFor(
      () => queryByRole('button', 'Try again', popover),
      'Try again of the failed turn',
    )
    await press(tryAgain)
    await waitFor(
      () => tabs().row.includes('Why manual entry works'),
      'the tab of the linked session',
    )
    expect({
      line: queryByRole('button', title, popover)?.parentElement?.textContent,
      tryAgain: queryByRole('button', 'Try again', popover),
      shown: tabs().shown,
    }).toEqual({
      line: `This session started from ${title}`,
      tryAgain: null,
      shown: 'Address autocomplete',
    })
  })

  it('keeps the popover of another explanation that the member opened while the reply waited, and the new text in the first explanation', async () => {
    const first = explained('explain-1', quote)
    const other = explained('explain-2', 'checkout form')
    const reply = deferred()
    const linked = linkedFrom(first.record, followUp)
    await mountChat({
      stored: [...first.events, ...other.events],
      setup: (fake) => opensLinked(fake, first.record, linked, reply.promise),
    })
    const popover = await openFromMark(title, 'Ready')
    await sendFollowUp(popover, followUp)
    await typeText(byRole('textbox', 'Follow-up', popover), 'And on a tablet?')
    const otherPopover = await openFromMark('Explain "checkout form"', 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, otherPopover),
      'the answer of the other explanation',
    )
    reply.resolve()
    await waitFor(
      () => tabs().row.includes(followUp),
      'the tab of the linked session',
    )
    const afterReply = {
      answer: queryByText(explanationAnswer, otherPopover) !== null,
      line: queryByRole('button', title, otherPopover),
    }
    const again = await openFromMark(title, 'Ready')
    expect({
      ...afterReply,
      field: messageText(byRole('textbox', 'Follow-up', again)),
    }).toEqual({ answer: true, line: null, field: 'And on a tablet?' })
  })
})
