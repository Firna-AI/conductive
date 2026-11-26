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
  SECRET_TURN,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT, press, waitFor } from '../../test-support/mount'
import { stackOf, storeEvents } from '../secrets/secret-test-kit'
import { textOf } from './render-kit'
import { first, mountChat, second as debounce } from './tab-drag-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const region = 'Requests that wait for an answer'
/** The secret turn of the fixtures starts here, and its work runs after. */
const start = FAKE_TIME + 20 * second
const inWork = start + 300

function updated(item: SecretRequest): [WorkspaceEvent, number] {
  return [
    {
      type: 'secrets.request.updated',
      sessionId: FAKE_IDS.session,
      request: item,
    },
    item.updatedAt,
  ]
}

/** A late request of the secret turn, made at `at`. */
function lateRequest(
  id: string,
  ask: (typeof asks)[keyof typeof asks],
  at: number,
): SecretRequest {
  return request(id, ask, at, { ...late(at), turnId: SECRET_TURN })
}

/** A button of the stack. */
function stackButton(name: string): HTMLElement {
  return byRole('button', name, byRole('group', region))
}

/** Puts the focus on an element, as a person does with Tab. */
async function focusOn(element: HTMLElement): Promise<void> {
  await act(async () => element.focus())
}

/** The card on top, as the stack gives it the focus. */
function cardOnTop(): Element | null {
  return byRole('group', region).querySelector('[tabindex="-1"]')
}

describe('the stack of requests above the composer', () => {
  test('Previous and Next move through the stack, each is off at its end, and a press that shows the first or the last card moves the focus to the other button', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    storeEvents(server, [
      updated(lateRequest('preview', asks.preview, FAKE_TIME + 2 * second)),
      updated(lateRequest('mapbox', asks.mapbox, FAKE_TIME + 4 * second)),
      updated(request('count', asks.database, FAKE_TIME + 8 * second)),
    ])
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    const seen = [stackOf(document)]
    await focusOn(stackButton('Next request'))
    await press(stackButton('Next request'))
    seen.push(stackOf(document))
    await press(stackButton('Next request'))
    seen.push(stackOf(document))
    const atLast = document.activeElement === stackButton('Previous request')
    await press(stackButton('Previous request'))
    await press(stackButton('Previous request'))
    seen.push(stackOf(document))
    const atFirst = document.activeElement === stackButton('Next request')
    expect({ seen, atLast, atFirst }).toEqual({
      seen: [
        { place: '1 of 3', top: 'Request for PROD_DATABASE_URL' },
        { place: '2 of 3', top: 'Request for VERCEL_TOKEN, MAPBOX_TOKEN' },
        { place: '3 of 3', top: 'Request for MAPBOX_TOKEN' },
        { place: '1 of 3', top: 'Request for PROD_DATABASE_URL' },
      ],
      atLast: true,
      atFirst: true,
    })
  })

  test('a request that joins or leaves keeps the card on top, and its place shows the new count', async () => {
    const server = new FakeApiServer()
    const database = lateRequest('database', asks.database, inWork)
    storeEvents(
      server,
      secretTurn(start, [
        updated(database),
        updated(lateRequest('vercel', asks.vercel, inWork + 100)),
      ]),
    )
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    await press(stackButton('Next request'))
    const seen = [stackOf(document)]
    await act(async () =>
      storeEvents(server, [
        updated(lateRequest('mapbox', asks.mapbox, inWork + 200)),
      ]),
    )
    seen.push(stackOf(document))
    await act(async () =>
      storeEvents(server, [
        updated({
          ...database,
          state: 'denied',
          answeredBy: priya,
          updatedAt: database.updatedAt + 90 * second,
        }),
      ]),
    )
    seen.push(stackOf(document))
    expect(seen).toEqual([
      { place: '2 of 2', top: 'Request for VERCEL_TOKEN' },
      { place: '2 of 3', top: 'Request for VERCEL_TOKEN' },
      { place: '1 of 2', top: 'Request for VERCEL_TOKEN' },
    ])
  })

  test('the answer of the card that holds the focus moves the focus to the new card on top, and the last answer moves it to the composer', async () => {
    const server = new FakeApiServer()
    const requests = [
      lateRequest('database', asks.database, inWork),
      lateRequest('vercel', asks.vercel, inWork + 100),
    ]
    storeEvents(server, secretTurn(start, requests.map(updated)))
    for (const item of requests) {
      server.json(
        'POST',
        secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, item.id),
        {
          request: {
            ...item,
            state: 'denied',
            answeredBy: cal,
            updatedAt: item.updatedAt + second,
          },
        },
      )
    }
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    await focusOn(stackButton('Deny'))
    await press(stackButton('Deny'))
    await waitFor(
      () => stackOf(document).top === 'Request for VERCEL_TOKEN',
      'the next card',
    )
    const card = cardOnTop()
    const onCard =
      document.activeElement === card &&
      card?.querySelector('section[aria-label="Request for VERCEL_TOKEN"]')
    await focusOn(stackButton('Deny'))
    await press(stackButton('Deny'))
    await waitFor(() => queryByRole('group', region) === null, 'the answer')
    expect({
      onCard: Boolean(onCard),
      composer: document.activeElement === byRole('textbox', 'Message'),
    }).toEqual({ onCard: true, composer: true })
  })

  test('while the sandbox is stopped, the last answer moves the focus to the place of the composer, which holds the stopped bar, and the composer takes it when the sandbox starts', async () => {
    const server = new FakeApiServer({ workspaceState: 'stopped' })
    const open = lateRequest('database', asks.database, inWork)
    storeEvents(server, secretTurn(start, [updated(open)]))
    server.json(
      'POST',
      secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, open.id),
      {
        request: {
          ...open,
          state: 'allowed',
          answeredBy: cal,
          updatedAt: open.updatedAt + second,
        },
      },
    )
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    await focusOn(stackButton('Allow for this session'))
    await press(stackButton('Allow for this session'))
    await waitFor(() => queryByRole('group', region) === null, 'the answer')
    const focused = document.activeElement
    const place =
      focused instanceof HTMLElement ? textOf(focused.outerHTML).trim() : null
    // The Worker starts the sandbox for the turn that tells the agent.
    const { workspace } = workspaceFixtures('stopped').detail
    await act(async () =>
      storeEvents(server, [
        [
          {
            type: 'workspace.updated',
            workspace: {
              ...workspace,
              state: 'starting',
              updatedAt: open.updatedAt + 2 * second,
            },
          },
          open.updatedAt + 2 * second,
        ],
      ]),
    )
    const field = await waitFor(
      () => queryByRole('textbox', 'Message'),
      'the composer',
    )
    expect({ place, composer: document.activeElement === field }).toEqual({
      place: 'Sandbox stopped Your files and chat are saved. Resume',
      composer: true,
    })
  })
})
