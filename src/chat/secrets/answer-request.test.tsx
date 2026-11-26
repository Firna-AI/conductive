// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  cal,
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
import { secretTurn } from '../../test-support/fixtures/secret-turn'
import {
  MOUNTED_TEST_TIMEOUT,
  press,
  typeText,
  waitFor,
} from '../../test-support/mount'
import {
  first,
  mountChat,
  second as debounce,
} from '../components/tab-drag-test-kit'
import {
  answerPathOf,
  cardsOf,
  lateRequest,
  stackName,
  storeEvents,
  textsOf,
  updated,
} from './secret-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The secret turn of the fixtures starts here, and its work runs after. */
const start = FAKE_TIME + 20 * second
const inWork = start + 300

/** Whether the button with this name, in the stack of requests, is off. */
function isOff(name: string): boolean {
  const button = byRole('button', name, byRole('group', stackName))
  return button instanceof HTMLButtonElement && button.disabled
}

describe('the answer to a secret request', () => {
  test('a request for a value keeps Allow off until the value is typed, shows a failed answer with the choices and the value kept, and sends the values with how long they last', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    const asked = request('asked', asks.mapbox, FAKE_TIME + 8 * second)
    storeEvents(server, [updated(asked)])
    const path = answerPathOf(asked)
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
    await press(byRole('button', 'Allow', byRole('group', stackName)))
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
    await press(byRole('button', 'Allow', byRole('group', stackName)))
    await waitFor(() => queryByRole('group', stackName) === null, 'the answer')
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
    server.json('POST', answerPathOf(open), {
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
      byRole('button', 'Allow for this session', byRole('group', stackName)),
    )
    await waitFor(() => queryByRole('group', stackName) === null, 'the answer')
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
})
