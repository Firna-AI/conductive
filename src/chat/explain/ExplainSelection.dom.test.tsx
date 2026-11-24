// @vitest-environment happy-dom
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { explainSessionPath } from '../../shared/sessions'
import type { SendMessageResponse } from '../../shared/messages'
import {
  byLabel,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import {
  anchorOf,
  answer,
  explanation,
  mountChat,
  recordEvent,
  select,
  selectText,
  textNodeWith,
} from './explain-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace, session } = FAKE_IDS
const explainPath = explainSessionPath(org, workspace, session)
const ask = workspaceFixtures().message

/** The reply of the Worker to a start: the new open session and its prompt. */
function started(eventNumber: number): SendMessageResponse {
  const record = explanation(
    'explain-new',
    anchorOf('Manual entry still works'),
    {
      activeTurnId: 'turn-new',
    },
  )
  return {
    eventNumber,
    session: record,
    turnId: 'turn-new',
    message: {
      id: 'prompt-new',
      sessionId: record.id,
      sender: ask.sender,
      text: 'Explain "Manual entry still works"',
      attachments: [],
      choice: record.choice,
      createdAt: FAKE_TIME + 120_000,
      state: 'queued',
    },
  }
}

/** The names of the tabs of the row, in their order, with the shown one. */
function tabNames(): { names: string[]; shown: string | null } {
  const row = byLabel('Sessions and files')
  const tabs = [...row.querySelectorAll('li > button')]
  return {
    names: tabs.map((tab) => tab.textContent ?? ''),
    shown:
      row.querySelector('button[aria-current="page"]')?.textContent ?? null,
  }
}

describe('Explain by a selection', () => {
  it('starts an explanation of a finished selection in an answer with the text around it, and keeps the parent tab shown', async () => {
    const { server, offers } = await mountChat({
      setup: (fake) =>
        fake.handle('POST', explainPath, async () =>
          Response.json(
            started(
              fake.events.history(Number.MAX_SAFE_INTEGER).throughEventNumber +
                1,
            ),
            { status: 201 },
          ),
        ),
    })
    const text = await waitFor(
      () => textNodeWith(document.body, answer.text),
      'the recorded answer',
    )
    await selectText(text, 'Manual entry still works')
    const explain = await waitFor(
      () => queryByRole('button', 'Explain'),
      'Explain by the selection',
    )
    expect(offers.commands().has('explain-selection')).toBe(true)
    await press(explain)
    await waitFor(
      () => queryByLabel('Explain "Manual entry still works", Working'),
      'the mark of the new explanation',
    )
    const sent = server.requests.filter(
      (request) => new URL(request.url).pathname === explainPath,
    )
    expect(await Promise.all(sent.map((request) => request.json()))).toEqual([
      {
        messageId: answer.messageId,
        quote: 'Manual entry still works',
        before: 'The checkout form now suggests addresses. ',
        after: '.',
        // The app chooses a new ID for each start.
        promptId: expect.any(String),
      },
    ])
    const tabs = tabNames()
    expect({ last: tabs.names.at(-1), shown: tabs.shown }).toEqual({
      last: 'Explain "Manual entry still works"',
      shown: workspaceFixtures().sessions.sessions[0]?.title,
    })
    expect({
      button: queryByRole('button', 'Explain'),
      offered: offers.commands().has('explain-selection'),
      popover:
        document.activeElement ===
        queryByRole('dialog', 'Explain "Manual entry still works"'),
    }).toEqual({ button: null, offered: false, popover: true })
  })

  it('runs Explain with its key while it shows, and gives a member message its quote', async () => {
    const { server, offers } = await mountChat({
      setup: (fake) =>
        fake.json(
          'POST',
          explainPath,
          {
            error: {
              code: 'agent_login_required',
              message: 'Connect your agent login to send a message.',
            },
          },
          409,
        ),
    })
    const text = await waitFor(
      () => textNodeWith(document.body, ask.text),
      'the message of the member',
    )
    await selectText(text, 'manual fields')
    await waitFor(() => queryByRole('button', 'Explain'), 'Explain')
    act(() => offers.run('explain-selection'))
    await waitFor(
      () => queryByText("The explanation didn't start"),
      'the notice of the refused start',
    )
    const [request] = server.requests.filter(
      (item) => new URL(item.url).pathname === explainPath,
    )
    expect(await request?.json()).toEqual({
      messageId: ask.id,
      quote: 'manual fields',
      before: 'Add address autocomplete to the checkout form. Keep the ',
      after: ' as a fallback.',
      promptId: expect.any(String),
    })
  })

  it('shows no Explain for a selection across two messages, in a tool line, or in an answer that the agent still writes', async () => {
    const { offers } = await mountChat()
    const first = await waitFor(
      () => textNodeWith(document.body, ask.text),
      'the message of the member',
    )
    const second = textNodeWith(document.body, answer.text)
    const across = document.createRange()
    across.setStart(first, 4)
    across.setEnd(second, 10)
    await select(across)
    const spanning = queryByRole('button', 'Explain')
    await selectText(document.body, '1 tool call')
    const toolLine = queryByRole('button', 'Explain')
    expect({
      spanning,
      toolLine,
      offered: offers.commands().has('explain-selection'),
    }).toEqual({
      spanning: null,
      toolLine: null,
      offered: false,
    })
  })

  it('shows no Explain for the text of an answer before it finishes', async () => {
    await mountChat({ conversation: 'running' })
    const text = await waitFor(
      () => textNodeWith(document.body, 'I will check the checkout form.'),
      'the answer that the agent writes',
    )
    await selectText(text, 'checkout form')
    expect(queryByRole('button', 'Explain')).toBeNull()
  })

  it('shows the marks of a read-only workspace with an ended turn or its failure, and no Explain or key', async () => {
    const running = explanation('explain-run', anchorOf('Manual entry'), {
      activeTurnId: 'turn-run',
    })
    const failed = explanation('explain-failed', anchorOf('checkout form'), {
      retryMessageId: 'prompt-failed',
    })
    const { offers } = await mountChat({
      readOnly: true,
      stored: [recordEvent(running), recordEvent(failed)],
    })
    await waitFor(
      () => queryByLabel('Explain "Manual entry", Ready'),
      'the mark with an ended turn',
    )
    await selectText(document.body, 'suggests addresses')
    expect({
      failed: queryByLabel('Explain "checkout form", Failed') !== null,
      button: queryByRole('button', 'Explain'),
      offered: offers.commands().has('explain-selection'),
    }).toEqual({ failed: true, button: null, offered: false })
  })
})
