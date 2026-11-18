// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { secretAnswerPath } from '../../shared/secret-requests'
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
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
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
import { storeEvents } from './secret-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const region = 'Requests that wait for an answer'

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
})
