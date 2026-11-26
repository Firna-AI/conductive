// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { sessionPaths } from '../../shared/sessions'
import type { FakeApiServer } from '../../test-support/fake-api'
import {
  byLabel,
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  pressKey,
  waitFor,
} from '../../test-support/mount'
import { mountChat } from './explain-test-kit'
import {
  explained,
  explanationAnswer,
  followUpReply,
  linkedFrom,
  nextEvent as next,
  openFromMark,
  sendFollowUp,
} from './popover-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const title = 'Explain "Manual entry still works"'

/** The paths of the requests of the fake, by method, in their order. */
function writes(server: FakeApiServer): string[] {
  return server.requests
    .filter((request) => request.method === 'POST')
    .map((request) => new URL(request.url).pathname)
}

describe('the popover of an explanation', () => {
  it('opens from its mark with the chat of the explanation without its written prompt, and Escape gives the focus back to the mark', async () => {
    const { events, prompt } = explained(
      'explain-1',
      'Manual entry still works',
    )
    await mountChat({ stored: events })
    const popover = await openFromMark(title, 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer of the explanation',
    )
    expect({
      focus: document.activeElement === popover,
      quote: queryByText('“Manual entry still works”', popover) !== null,
      prompt: popover.textContent?.includes(prompt.text.split('\n')[0] ?? ''),
    }).toEqual({ focus: true, quote: true, prompt: false })
    await pressKey('Escape')
    expect({
      popover: queryByRole('dialog', title),
      focus: document.activeElement?.getAttribute('aria-label'),
    }).toEqual({ popover: null, focus: `${title}, Ready` })
  })

  it('steers a running turn with a follow-up, and Stop stops the turn', async () => {
    const { events, record } = explained(
      'explain-1',
      'Manual entry still works',
      {
        running: true,
      },
    )
    const { server } = await mountChat({
      stored: events,
      setup: (fake) => {
        fake.handle(
          'POST',
          sessionPaths.messages(org, workspace, record.id),
          async (request) =>
            Response.json(await followUpReply(request, record, next(fake)), {
              status: 202,
            }),
        )
        fake.json('POST', sessionPaths.interrupt(org, workspace, record.id), {
          turnId: record.activeTurnId,
          state: 'stopping',
        })
      },
    })
    const popover = await openFromMark(title, 'Working')
    await sendFollowUp(popover, 'How many saved addresses have no postcode?')
    await waitFor(
      () => queryByText('How many saved addresses have no postcode?', popover),
      'the follow-up in the popover',
    )
    await press(byRole('button', 'Stop', popover))
    const [sent] = server.requests.filter((request) =>
      request.url.endsWith(sessionPaths.messages(org, workspace, record.id)),
    )
    expect({
      writes: writes(server),
      text: (await sent?.json())?.text,
    }).toEqual({
      writes: [
        sessionPaths.messages(org, workspace, record.id),
        sessionPaths.interrupt(org, workspace, record.id),
      ],
      text: 'How many saved addresses have no postcode?',
    })
  })

  it('reopens a closed explanation for a follow-up in place, and keeps the parent tab shown', async () => {
    const { events, record } = explained(
      'explain-1',
      'Manual entry still works',
      {
        closed: true,
      },
    )
    const reopened = { ...record, closedAt: null }
    const { server } = await mountChat({
      stored: events,
      setup: (fake) => {
        fake.handle(
          'POST',
          sessionPaths.reopen(org, workspace, record.id),
          async () =>
            Response.json({ session: reopened, eventNumber: next(fake) }),
        )
        fake.handle(
          'POST',
          sessionPaths.messages(org, workspace, record.id),
          async (request) =>
            Response.json(await followUpReply(request, reopened, next(fake)), {
              status: 202,
            }),
        )
      },
    })
    const popover = await openFromMark(title, 'Ready')
    const notice = queryByText('The tab is closed', popover)
    await sendFollowUp(popover, 'And on a phone?')
    await waitFor(
      () => queryByText('And on a phone?', popover),
      'the follow-up',
    )
    const tabs = byLabel('Sessions and files')
    expect({
      notice: notice !== null,
      writes: writes(server),
      shown: tabs.querySelector('[aria-current="page"]')?.textContent,
      tab: tabs.textContent?.includes(title),
    }).toEqual({
      notice: true,
      writes: [
        sessionPaths.reopen(org, workspace, record.id),
        sessionPaths.messages(org, workspace, record.id),
      ],
      shown: 'Address autocomplete',
      tab: true,
    })
  })

  it('reopens a closed explanation with Expand and shows its tab', async () => {
    const { events, record } = explained(
      'explain-1',
      'Manual entry still works',
      {
        closed: true,
      },
    )
    const reopened = { ...record, closedAt: null }
    const { server } = await mountChat({
      stored: events,
      setup: (fake) =>
        fake.handle(
          'POST',
          sessionPaths.reopen(org, workspace, record.id),
          async () =>
            Response.json({ session: reopened, eventNumber: next(fake) }),
        ),
    })
    const popover = await openFromMark(title, 'Ready')
    await press(byRole('button', 'Expand', popover))
    const tabs = byLabel('Sessions and files')
    await waitFor(
      () => tabs.querySelector('[aria-current="page"]')?.textContent === title,
      'the tab of the explanation',
    )
    expect({
      writes: writes(server),
      popover: queryByRole('dialog', title),
    }).toEqual({
      writes: [sessionPaths.reopen(org, workspace, record.id)],
      popover: null,
    })
  })

  it('shows the chat to read in a read-only workspace, with no follow-up field and no Stop', async () => {
    const { events } = explained('explain-1', 'Manual entry still works', {
      running: true,
    })
    await mountChat({ stored: events, readOnly: true })
    const popover = await openFromMark(title, 'Ready')
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the answer to read',
    )
    expect({
      field: queryByRole('textbox', 'Follow-up', popover),
      stop: queryByRole('button', 'Stop', popover),
      expand: queryByRole('button', 'Expand', popover) !== null,
    }).toEqual({ field: null, stop: null, expand: true })
  })

  it('shows the linked session of a follow-up that the login of the explanation cannot take, with its line back', async () => {
    const { events, record } = explained(
      'explain-1',
      'Manual entry still works',
    )
    const linked = linkedFrom(record, 'And on a phone?')
    await mountChat({
      stored: events,
      setup: (fake) =>
        fake.handle(
          'POST',
          sessionPaths.messages(org, workspace, record.id),
          async (request) =>
            Response.json(await followUpReply(request, linked, next(fake)), {
              status: 202,
            }),
        ),
    })
    const popover = await openFromMark(title, 'Ready')
    await sendFollowUp(popover, 'And on a phone?')
    const back = await waitFor(
      () => queryByRole('button', title, popover),
      'the line of the linked session',
    )
    const shown = {
      line: back.parentElement?.textContent,
      answer: queryByText(explanationAnswer, popover),
    }
    await press(back)
    await waitFor(
      () => queryByText(explanationAnswer, popover),
      'the explanation again',
    )
    expect({
      ...shown,
      tab: byLabel('Sessions and files').textContent?.includes(
        'And on a phone?',
      ),
    }).toEqual({
      line: `This session started from ${title}`,
      answer: null,
      tab: true,
    })
  })
})
