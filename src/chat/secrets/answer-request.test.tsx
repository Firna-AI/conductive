// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { WorkspaceEvent } from '../../shared/events'
import {
  secretAnswerPath,
  type SecretRequest,
} from '../../shared/secret-requests'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  cal,
  late,
  request,
  second,
  SECRET_TURN,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import { textOf } from '../components/render-kit'
import {
  first,
  mountChat,
  second as debounce,
} from '../components/tab-drag-test-kit'
import { cardsOf, stackOf, storeEvents } from './secret-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const region = 'Requests that wait for an answer'
/** The secret turn of the fixtures starts here, and its work runs after. */
const start = FAKE_TIME + 20 * second
const inWork = start + 300

/** A late request of the secret turn, made at `at`. */
function lateRequest(id: string, at: number, reason: string): SecretRequest {
  return request(id, asks.database, at, {
    ...late(at),
    turnId: SECRET_TURN,
    reason,
  })
}

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

/** The answer path of a request of the fake workspace. */
function pathOf(item: SecretRequest): string {
  return secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, item.id)
}

/** The paths and the bodies of the answers that the chat sent, in order. */
async function answersSent(server: FakeApiServer) {
  const sent = server.requests.filter(
    (item) => item.method === 'POST' && item.url.includes('/secret-requests/'),
  )
  return Promise.all(
    sent.map(async (item) => ({
      path: new URL(item.url).pathname,
      body: (await item.clone().json()) as unknown,
    })),
  )
}

/** The text of each card with this name, in the order of the page. */
function textsOf(label: string): string[] {
  const cards = document.querySelectorAll(`section[aria-label="${label}"]`)
  return Array.from(cards, (card) => textOf(card.outerHTML).trim())
}

/** Three late requests for PROD_DATABASE_URL, the oldest first. */
const askedThrice = [
  lateRequest('postcode', inWork, 'Count the addresses without a postcode.'),
  lateRequest('country', inWork + 100, 'Count them by country.'),
  lateRequest('cities', inWork + 200, 'Find the cities with the most of them.'),
]

/** Whether the button with this name, in the region of requests, is off. */
function isOff(name: string): boolean {
  const button = byRole('button', name, byRole('group', region))
  return button instanceof HTMLButtonElement && button.disabled
}

describe('the answer to a secret request', () => {
  test('a request for a value keeps Allow off until the value is typed, shows a failed answer with the choices and the value kept, and sends the values with how long they last', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    const asked = request('asked', asks.mapbox, FAKE_TIME + 8 * second)
    storeEvents(server, [
      [
        {
          type: 'secrets.request.updated',
          sessionId: FAKE_IDS.session,
          request: asked,
        },
        asked.updatedAt,
      ],
    ])
    const path = secretAnswerPath(FAKE_IDS.org, FAKE_IDS.workspace, asked.id)
    server.json(
      'POST',
      path,
      {
        error: {
          code: 'secret_request_ended',
          message: 'This request is no longer open.',
        },
      },
      409,
    )
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    const empty = isOff('Allow')
    const field = byRole('textbox', 'Value of MAPBOX_TOKEN')
    await typeText(field, 'pk.mapbox-value')
    await press(byRole('radio', 'This workspace'))
    const typed = isOff('Allow')
    await press(byRole('button', 'Allow', byRole('group', region)))
    await waitFor(() => queryByText('The answer was not sent'), 'the notice')
    expect({
      empty,
      typed,
      notice: queryByText('This request is no longer open.') !== null,
      allowOff: isOff('Allow'),
      kept: field instanceof HTMLInputElement ? field.value : null,
    }).toEqual({
      empty: true,
      typed: false,
      notice: true,
      allowOff: false,
      kept: 'pk.mapbox-value',
    })
    server.json('POST', path, {
      request: {
        ...asked,
        state: 'allowed',
        answeredBy: cal,
        lifetime: 'workspace',
        updatedAt: asked.updatedAt + second,
      },
    })
    await press(byRole('button', 'Allow', byRole('group', region)))
    await waitFor(() => queryByRole('group', region) === null, 'the answer')
    const sent = server.requests.filter(
      (item) => item.method === 'POST' && new URL(item.url).pathname === path,
    )
    const answer = {
      kind: 'values',
      lifetime: 'workspace',
      values: { MAPBOX_TOKEN: 'pk.mapbox-value' },
    }
    expect(await Promise.all(sent.map((item) => item.clone().json()))).toEqual([
      answer,
      answer,
    ])
  })

  test('an Allow of a late request moves it from the stack above the composer to its place in its turn, where it stays unfolded with its answer', async () => {
    const server = new FakeApiServer()
    const open = lateRequest('late', inWork, asks.database.reason)
    storeEvents(server, secretTurn(start, [updated(open)]))
    server.json('POST', pathOf(open), {
      request: {
        ...open,
        state: 'allowed',
        answeredBy: cal,
        updatedAt: open.updatedAt + second,
        notice: { state: 'sent', turnId: 'turn-answer-late' },
      },
    })
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    const before = cardsOf(document)
    await press(
      byRole('button', 'Allow for this session', byRole('group', region)),
    )
    await waitFor(() => queryByRole('group', region) === null, 'the answer')
    expect({
      before,
      after: cardsOf(document),
      card: textsOf('Request for PROD_DATABASE_URL'),
    }).toEqual({
      before: ['Request for PROD_DATABASE_URL (above the composer)'],
      after: ['Request for PROD_DATABASE_URL'],
      card: [
        expect.stringMatching(
          /^PROD_DATABASE_URL Allowed for this session .* You answered, and a new turn told the agent\.$/,
        ),
      ],
    })
  })

  test('the Deny of a card that hides two older requests for the same secrets sends one Deny for each, the shown request last, and each takes its place with its denial', async () => {
    const server = new FakeApiServer()
    storeEvents(server, secretTurn(start, askedThrice.map(updated)))
    for (const item of askedThrice) {
      server.json('POST', pathOf(item), {
        request: {
          ...item,
          state: 'denied',
          answeredBy: cal,
          updatedAt: item.updatedAt + second,
        },
      })
    }
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    await press(byRole('button', 'Deny', byRole('group', region)))
    await waitFor(() => queryByRole('group', region) === null, 'the Denies')
    expect({
      sent: await answersSent(server),
      cards: textsOf('Request for PROD_DATABASE_URL'),
    }).toEqual({
      sent: askedThrice.map((item) => ({
        path: pathOf(item),
        body: { kind: 'deny' },
      })),
      cards: askedThrice.map((item) =>
        expect.stringMatching(
          new RegExp(
            `^PROD_DATABASE_URL Denied .*${item.reason} .* You denied it\\.$`,
          ),
        ),
      ),
    })
  })

  test('the Allow of a card that hides requests sends one Allow, for the request that it shows, and the requests that its grant covers leave the stack with it', async () => {
    const server = new FakeApiServer()
    storeEvents(server, secretTurn(start, askedThrice.map(updated)))
    const allowed = (item: SecretRequest): SecretRequest => ({
      ...item,
      state: 'allowed',
      answeredBy: cal,
      updatedAt: item.updatedAt + second,
    })
    const shown = askedThrice[2]
    server.handle('POST', pathOf(shown), async () => {
      // The Worker allows each request that the grant covers.
      storeEvents(server, askedThrice.slice(0, 2).map(allowed).map(updated))
      return Response.json({ request: allowed(shown) })
    })
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    const card = stackOf(document)
    const asked = queryByText('Asked 3 times') !== null
    await press(
      byRole('button', 'Allow for this session', byRole('group', region)),
    )
    await waitFor(() => queryByRole('group', region) === null, 'the Allow')
    expect({ card, asked, sent: await answersSent(server) }).toEqual({
      card: { place: null, top: 'Request for PROD_DATABASE_URL' },
      asked: true,
      sent: [{ path: pathOf(shown), body: { kind: 'allow' } }],
    })
  })
})
