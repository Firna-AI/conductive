// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import {
  secretAnswerPath,
  type SecretRequest,
} from '../../shared/secret-requests'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  cal,
  late,
  priya,
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { storeEvents } from '../secrets/secret-test-kit'
import {
  debounce,
  first,
  mountChat,
  second as other,
} from './tab-drag-test-kit'
import { tabIcons } from './tab-row-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const region = 'Requests that wait for an answer'

/** The event of a state of a request, for the session that holds it. */
function updated(item: SecretRequest): [WorkspaceEvent, number] {
  return [
    {
      type: 'secrets.request.updated',
      sessionId: item.sessionId,
      request: item,
    },
    item.updatedAt,
  ]
}

describe('the needs-input mark of a session tab', () => {
  test('a tab of another session shows the mark while its request is open, and the mark ends when a member answers it in another view', async () => {
    const server = new FakeApiServer()
    const asked = request('preview', asks.preview, FAKE_TIME, {
      ...late(FAKE_TIME + 90 * second),
      sessionId: 'debounce',
    })
    storeEvents(server, [updated(asked)])
    await mountChat({ server, tabs: [first, other], viewport: 'desktop' })
    await waitFor(
      () => tabIcons().includes(`${debounce}: Needs input`),
      'the mark of the tab of the other session',
    )
    const open = tabIcons()
    const [event, at] = updated({
      ...asked,
      state: 'denied',
      answeredBy: priya,
      updatedAt: FAKE_TIME + 120 * second,
    })
    act(() =>
      server.events.emit({
        workspaceId: FAKE_IDS.workspace,
        eventNumber: server.events.last(FAKE_IDS.workspace) + 1,
        occurredAt: at,
        event,
      }),
    )
    expect({ open, answered: tabIcons() }).toEqual({
      open: ['Address autocomplete: chat', `${debounce}: Needs input`],
      answered: ['Address autocomplete: chat', `${debounce}: chat`],
    })
  })

  test('the mark of the shown tab takes the place of the spinner of its running turn, and the spinner shows again after the answer', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    const asked = request('count', asks.database, FAKE_TIME + 8 * second)
    storeEvents(server, [updated(asked)])
    server.json(
      'POST',
      secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, asked.id),
      {
        request: {
          ...asked,
          state: 'denied',
          answeredBy: cal,
          updatedAt: asked.updatedAt + second,
        },
      },
    )
    await mountChat({ server, tabs: [first, other], viewport: 'desktop' })
    const stack = await waitFor(() => queryByRole('group', region), 'the stack')
    const waiting = tabIcons()
    await press(byRole('button', 'Deny', stack))
    await waitFor(() => queryByRole('group', region) === null, 'the answer')
    // The turn of the other session runs too, with no request.
    expect({ waiting, answered: tabIcons() }).toEqual({
      waiting: ['Address autocomplete: Needs input', `${debounce}: Working`],
      answered: ['Address autocomplete: Working', `${debounce}: Working`],
    })
  })

  test('a Mac command that waits marks the tab of its session in a browser, which cannot answer it', async () => {
    const server = new FakeApiServer({ macCommands: 'waiting' })
    await mountChat({ server, tabs: [first, other], viewport: 'desktop' })
    await waitFor(
      () => document.querySelector('section[aria-label^="Command on"]'),
      'the command in the stack',
    )
    expect(tabIcons()).toEqual([
      'Address autocomplete: Needs input',
      `${debounce}: chat`,
    ])
  })
})
