// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import type { SecretRequest } from '../../shared/secret-requests'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { cal, second } from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import {
  first,
  mountChat,
  second as debounce,
} from '../components/tab-drag-test-kit'
import {
  answerPathOf,
  answersSent,
  cardsOf,
  lateRequest,
  stackName,
  stackOf,
  storeEvents,
  textOfCard,
  textsOf,
  updated,
} from './secret-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The secret turn of the fixtures starts here, and its work runs after. */
const start = FAKE_TIME + 20 * second
const inWork = start + 300
const name = 'Request for PROD_DATABASE_URL'

/** Three late requests for PROD_DATABASE_URL, the oldest first. */
const askedThrice = [
  lateRequest('postcode', inWork, 'Count the addresses without a postcode.'),
  lateRequest('country', inWork + 100, 'Count them by country.'),
  lateRequest('cities', inWork + 200, 'Find the cities with the most of them.'),
]
const [postcode, country, cities] = askedThrice

/** A request after the answer of Cal, a second after its last state. */
function answered(
  item: SecretRequest,
  state: 'allowed' | 'denied',
): SecretRequest {
  return { ...item, state, answeredBy: cal, updatedAt: item.updatedAt + second }
}

/** The Deny of a request, as the chat sends it. */
function denyOf(item: SecretRequest) {
  return { path: answerPathOf(item), body: { kind: 'deny' } }
}

/** A button of the stack of requests. */
function stackButton(label: string): HTMLElement {
  return byRole('button', label, byRole('group', stackName))
}

describe('the answer to a card that hides older requests for the same secrets', () => {
  test('its Deny sends one Deny for each request, the shown request last; after a failed Deny of a hidden request, the card keeps the shown request with its choices and a notice, and a second press denies the rest', async () => {
    const server = new FakeApiServer()
    storeEvents(server, secretTurn(start, askedThrice.map(updated)))
    const failure = {
      error: { code: 'internal_error', message: 'The server is busy.' },
    }
    server.json('POST', answerPathOf(postcode), failure, 500)
    for (const item of [country, cities]) {
      server.json('POST', answerPathOf(item), {
        request: answered(item, 'denied'),
      })
    }
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    await press(stackButton('Deny'))
    await waitFor(() => queryByText('The answer was not sent'), 'the notice')
    const card = textOfCard(byRole('group', stackName), name)
    const deny = stackButton('Deny')
    expect({
      sent: await answersSent(server),
      head: card.slice(0, card.indexOf(' Deny')),
      reason: card.includes(cities.reason),
      denyOff: deny instanceof HTMLButtonElement && deny.disabled,
    }).toEqual({
      sent: [denyOf(postcode), denyOf(country)],
      head: 'PROD_DATABASE_URL Asked 2 times',
      reason: true,
      denyOff: false,
    })
    server.json('POST', answerPathOf(postcode), {
      request: answered(postcode, 'denied'),
    })
    await press(stackButton('Deny'))
    await waitFor(() => stackOf(document).top === null, 'the Denies')
    expect({
      sent: await answersSent(server),
      cards: textsOf(name),
    }).toEqual({
      sent: [
        denyOf(postcode),
        denyOf(country),
        denyOf(postcode),
        denyOf(cities),
      ],
      cards: askedThrice.map((item) =>
        expect.stringMatching(
          new RegExp(
            `^PROD_DATABASE_URL Denied .*${item.reason} .* You denied it\\.$`,
          ),
        ),
      ),
    })
  })

  test('its Allow sends one Allow, and the card leaves at once while the Worker allows each request that it hides after the shown one, each with its own event', async () => {
    const server = new FakeApiServer()
    storeEvents(server, secretTurn(start, askedThrice.map(updated)))
    const covered = deferred()
    server.handle('POST', answerPathOf(cities), async () => {
      // The Worker publishes the Allow of the shown request first. Then it
      // allows each request that the grant covers, the oldest first, and
      // then it replies.
      storeEvents(server, [updated(answered(cities, 'allowed'))])
      await covered.promise
      storeEvents(server, [
        updated(answered(postcode, 'allowed')),
        updated(answered(country, 'allowed')),
      ])
      return Response.json({ request: answered(cities, 'allowed') })
    })
    await mountChat({ server, tabs: [first, debounce], viewport: 'desktop' })
    const asked = queryByText('Asked 3 times') !== null
    await press(stackButton('Allow for this session'))
    await waitFor(() => cardsOf(document).includes(name), 'the shown Allow')
    const atAllow = { cards: cardsOf(document), stack: stackOf(document) }
    covered.resolve()
    await waitFor(() => cardsOf(document).length === 3, 'the covered Allows')
    expect({
      asked,
      atAllow,
      cards: textsOf(name),
      sent: await answersSent(server),
    }).toEqual({
      asked: true,
      atAllow: { cards: [name], stack: { place: null, top: null } },
      cards: askedThrice.map((item) =>
        expect.stringMatching(
          new RegExp(
            `^PROD_DATABASE_URL Allowed for this session .*${item.reason} .* You answered\\.$`,
          ),
        ),
      ),
      sent: [{ path: answerPathOf(cities), body: { kind: 'allow' } }],
    })
  })
})
