// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  secretAnswerPath,
  type SecretRequest,
} from '../../shared/secret-requests'
import {
  stackName,
  storeEvents,
  updated,
} from '../../chat/secrets/secret-test-kit'
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
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle, typeText } from '../test-mount'
import { bodiesOf, emit, id, org } from './kept-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** A request for the value of MAPBOX_TOKEN, which a phone takes in a sheet. */
const asked = request('asked', asks.mapbox, FAKE_TIME + 8 * second)

/**
 * The name of the card in the stack of requests that holds the focus, or
 * null when the focus is outside the stack.
 */
function focusedCard(): string | null {
  const active = document.activeElement
  if (!active?.closest(`[aria-label="${stackName}"]`)) return null
  return (
    active.querySelector('section[aria-label]')?.getAttribute('aria-label') ??
    null
  )
}

/** Opens the sheet of the value of the request on top, in a phone tab. */
async function openSheet(server: FakeApiServer) {
  const tab = await openTab(server, { viewport: 'phone' })
  const card = byRole('region', 'Request for MAPBOX_TOKEN', tab.view)
  const buttons = Array.from(card.querySelectorAll('button'), (button) =>
    button.textContent?.trim(),
  )
  const inCard = queryByRole('textbox', 'Value of MAPBOX_TOKEN', tab.view)
  click(byRole('button', 'Give a value', card))
  await settle()
  return { tab, buttons, inCard, sheet: byRole('dialog', 'Give a value') }
}

describe('a secret request on a phone', () => {
  test('a request for a value shows Deny and Give a value, which opens a sheet with the value, how long it lasts, and Allow; Allow sends the values, and the focus goes to the card while the answer runs, then to the composer', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    storeEvents(server, [updated(asked)])
    const path = secretAnswerPath(org, id, asked.id)
    const reply = deferred()
    server.handle('POST', path, async () => {
      await reply.promise
      return Response.json({
        request: {
          ...asked,
          state: 'allowed',
          answeredBy: cal,
          lifetime: '15-minutes',
          updatedAt: asked.updatedAt + second,
        },
      })
    })
    const { tab, buttons, inCard, sheet } = await openSheet(server)
    expect({ buttons, inCard }).toEqual({
      buttons: ['Deny', 'Give a value'],
      inCard: null,
    })
    const field = byRole('textbox', 'Value of MAPBOX_TOKEN', sheet)
    const focused = document.activeElement === field
    typeText(field, 'pk.mapbox-value')
    click(byRole('button', 'Allow', sheet))
    await waitFor(
      () => queryByRole('dialog', 'Give a value') === null,
      'the sheet to close',
    )
    const whileAnswer = focusedCard()
    reply.resolve()
    await waitFor(
      () => queryByRole('group', stackName, tab.view) === null,
      'the answer',
    )
    expect({
      modal: sheet.getAttribute('aria-modal'),
      focused,
      sent: await bodiesOf(server, 'POST', path, 0),
      whileAnswer,
      composer:
        document.activeElement === byRole('textbox', 'Message', tab.view),
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
      whileAnswer: 'Request for MAPBOX_TOKEN',
      composer: true,
    })
  })

  test('a card that leaves while its sheet is open, after an answer in another view, gives the focus to the new card on top', async () => {
    const server = new FakeApiServer({ conversation: 'running' })
    const database: SecretRequest = request(
      'database',
      asks.database,
      FAKE_TIME + 4 * second,
      late(FAKE_TIME + 94 * second),
    )
    storeEvents(server, [updated(database), updated(asked)])
    const { sheet } = await openSheet(server)
    const inSheet = sheet.contains(document.activeElement)
    emit(server, {
      type: 'secrets.request.updated',
      sessionId: FAKE_IDS.session,
      request: {
        ...asked,
        state: 'denied',
        answeredBy: priya,
        updatedAt: asked.updatedAt + 10 * second,
      },
    })
    await waitFor(
      () => queryByRole('dialog', 'Give a value') === null,
      'the sheet to close',
    )
    expect({ inSheet, card: focusedCard() }).toEqual({
      inSheet: true,
      card: 'Request for PROD_DATABASE_URL',
    })
  })
})
