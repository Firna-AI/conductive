// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { DEVICE_CURRENT_PATH, DEVICE_SETTINGS_PATH } from '../../shared/device'
import { byRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle } from '../test-mount'
import {
  macAccessText,
  macRequests,
  noGrants,
  openControl,
  serverOf,
  settingsOf,
  switchOf,
  switchState,
  untilStop,
} from './mac-access-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

// The control chooses its parts by where it runs, not by a pairing (Mac
// access decisions 5 A and 7), so the Mac app with no device connection
// still shows the switch, and a browser shows none.

/** The part while the page cannot read the settings of this Mac. */
const notAvailable = 'Mac access This Mac is not available.'

/** How many times the page read the pairing of this window. */
const pairingReads = (server: FakeApiServer) =>
  server.requests.filter(
    (request) => new URL(request.url).pathname === DEVICE_CURRENT_PATH,
  ).length

describe('the switch of Mac access with no Mac to read', () => {
  test('in the Mac app with no device connection, is off and disabled, and says that this Mac is not available', async () => {
    const server = serverOf({ onMac: false })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => pairingReads(server) > 0, 'the read of this Mac')
    await settle()
    expect({
      mac: switchState(control),
      text: macAccessText(control),
      posts: macRequests(server, 'POST'),
    }).toEqual({
      mac: { on: false, locked: true },
      text: notAvailable,
      posts: 0,
    })
  })

  test('shows Not started with the cause of a switch-on whose read finds this Mac gone, sends nothing to a Mac, and leaves the switch off and disabled', async () => {
    const server = serverOf({ onMac: true })
    settingsOf(server, noGrants)
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => !switchState(control).locked, 'the settings')
    // This Mac loses its device connection before the start reads it.
    server.json('GET', DEVICE_CURRENT_PATH, { device: null })
    click(switchOf(control))
    await waitFor(
      () => macAccessText(control).includes('Not started'),
      'the result',
    )
    expect({
      mac: switchState(control),
      text: macAccessText(control),
      posts: macRequests(server, 'POST'),
    }).toEqual({
      mac: { on: false, locked: true },
      text: 'Mac access Not started This Mac is not available, so each command still asks first. Try again once it connects.',
      posts: 0,
    })
  })

  test('after a reopen whose read of this Mac fails, which follows a read that listed the grant until Stop, is off and disabled, and says that this Mac is not available', async () => {
    const server = serverOf({ onMac: true })
    settingsOf(server, untilStop)
    const tab = await openTab(server, { macApp: true })
    const first = await openControl(tab.view)
    await waitFor(() => switchState(first).on, 'the switch on')
    // A second press of the tool closes the control, and a third opens it.
    click(byRole('button', 'Capabilities', tab.view))
    await settle()
    const badGateway = new Response('Bad gateway', { status: 502 })
    server.response('GET', DEVICE_SETTINGS_PATH, badGateway)
    const gets = macRequests(server, 'GET')
    const control = await openControl(tab.view)
    await waitFor(() => macRequests(server, 'GET') > gets, 'the failed read')
    await settle()
    expect({
      mac: switchState(control),
      text: macAccessText(control),
    }).toEqual({ mac: { on: false, locked: true }, text: notAvailable })
  })

  test('in a browser, the control shows no Mac access part and reads nothing from a Mac', async () => {
    const server = serverOf({ onMac: false })
    const tab = await openTab(server)
    const control = await openControl(tab.view)
    expect({
      parts: Array.from(
        control.querySelectorAll('section[aria-label]'),
        (part) => part.getAttribute('aria-label'),
      ),
      mac: [macRequests(server, 'GET'), macRequests(server, 'POST')],
    }).toEqual({ parts: ['Secrets'], mac: [0, 0] })
  })
})
