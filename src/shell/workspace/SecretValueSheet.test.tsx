// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { secretAnswerPath } from '../../shared/secret-requests'
import { storeEvents } from '../../chat/secrets/secret-test-kit'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  asks,
  cal,
  request,
  second,
} from '../../test-support/fixtures/secret-requests'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle, typeText } from '../test-mount'
import { bodiesOf, id, org } from './kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('a secret request on a phone', () => {
  test('a request for a value shows Deny and Give a value, which opens a sheet with the value, how long it lasts, and Allow, and Allow sends the values', async () => {
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
    const path = secretAnswerPath(org, id, asked.id)
    server.json('POST', path, {
      request: {
        ...asked,
        state: 'allowed',
        answeredBy: cal,
        lifetime: '15-minutes',
        updatedAt: asked.updatedAt + second,
      },
    })
    const tab = await openTab(server, { viewport: 'phone' })
    const card = byRole('region', 'Request for MAPBOX_TOKEN', tab.view)
    const buttons = Array.from(card.querySelectorAll('button'), (button) =>
      button.textContent?.trim(),
    )
    const inCard = queryByRole('textbox', 'Value of MAPBOX_TOKEN', tab.view)
    expect({ buttons, inCard }).toEqual({
      buttons: ['Deny', 'Give a value'],
      inCard: null,
    })
    click(byRole('button', 'Give a value', card))
    await settle()
    const sheet = byRole('dialog', 'Give a value')
    const field = byRole('textbox', 'Value of MAPBOX_TOKEN', sheet)
    const focused = document.activeElement === field
    typeText(field, 'pk.mapbox-value')
    click(byRole('button', 'Allow', sheet))
    await waitFor(
      () => queryByRole('dialog', 'Give a value') === null,
      'the sheet to close',
    )
    expect({
      modal: sheet.getAttribute('aria-modal'),
      focused,
      sent: await bodiesOf(server, 'POST', path, 0),
    }).toEqual({
      modal: 'true',
      focused: true,
      sent: [
        {
          kind: 'values',
          lifetime: '15-minutes',
          values: { MAPBOX_TOKEN: 'pk.mapbox-value' },
        },
      ],
    })
  })
})
