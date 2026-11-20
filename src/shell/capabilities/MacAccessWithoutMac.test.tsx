// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { byRole } from '../../test-support/dom-queries'
import {
  FAKE_PAIRING,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { MOUNTED_TEST_TIMEOUT, waitFor } from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle } from '../test-mount'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  answerMacAccess,
  boxState,
  hint,
  line,
  lineBox,
  macAccessText,
  macRequests,
  noGrants,
  openControl,
  path,
  serverOf,
  settingsOf,
  stop,
  switchOf,
  untilStop,
  writesOf,
} from './mac-access-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

// The control chooses the line or the note by where it runs, not by a
// pairing (Mac access decision 5 A), so the Mac app with no device
// connection still shows the line.

describe('Mac access with no Mac to start a grant on', () => {
  test('in the Mac app with no device connection, the line shows unchecked and off, and a switch-on still saves Mac access and says that the start did not reach this Mac', async () => {
    const server = serverOf({ macAccess: true, onMac: false })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => lineBox(control)?.disabled, 'the line that is off')
    const before = {
      box: boxState(lineBox(control)),
      text: macAccessText(control),
    }
    const from = server.requests.length
    answerMacAccess(server, false)
    click(switchOf(control))
    await settle()
    answerMacAccess(server, true)
    click(switchOf(control))
    await waitFor(
      () => macAccessText(control).includes('Not started'),
      'the result',
    )
    expect({
      before,
      box: boxState(lineBox(control)),
      text: macAccessText(control),
      writes: writesOf(server, from),
    }).toEqual({
      before: {
        box: { checked: false, off: true },
        text: `${line} This Mac is not available.`,
      },
      box: { checked: false, off: true },
      text: `${line} Commands from this workspace run without asking, until you stop. Not started This Mac is not available, so each command still asks first. Try again once it connects.`,
      writes: [`PATCH ${path}`, `PATCH ${path}`],
    })
  })

  test('a reopen whose read of this Mac fails, after a read that listed the grant until Stop, shows the line unchecked and off, and a switch-off still stops that grant', async () => {
    const server = serverOf({ macAccess: true, onMac: true })
    settingsOf(server, untilStop)
    const tab = await openTab(server, { macApp: true })
    const first = await openControl(tab.view)
    await waitFor(() => lineBox(first)?.checked, 'the checked line')
    // A second press of the tool closes the control, and a third opens it.
    click(byRole('button', 'Capabilities', tab.view))
    await settle()
    const badGateway = new Response('Bad gateway', { status: 502 })
    server.response('GET', DEVICE_SETTINGS_PATH, badGateway)
    const control = await openControl(tab.view)
    await waitFor(() => lineBox(control)?.disabled, 'the line that is off')
    const reopened = {
      box: boxState(lineBox(control)),
      text: macAccessText(control),
    }
    const from = server.requests.length
    const posts = macRequests(server, 'POST')
    answerMacAccess(server, false)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'POST') > posts, 'the Stop')
    await settle()
    expect({
      reopened,
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      reopened: {
        box: { checked: false, off: true },
        text: `${line} This Mac is not available.`,
      },
      writes: [`PATCH ${path}`, `POST ${DEVICE_SETTINGS_PATH}`],
      changes: [{ ...FAKE_PAIRING, operation: stop }],
    })
  })

  test('in a browser, the switch saves Mac access with no start, and a note of the Mac app takes the place of the line', async () => {
    const server = serverOf({ macAccess: false, onMac: false })
    const tab = await openTab(server)
    const control = await openControl(tab.view)
    const off = macAccessText(control)
    answerMacAccess(server, true)
    click(switchOf(control))
    await settle()
    expect({
      off,
      on: macAccessText(control),
      line: lineBox(control),
      mac: [macRequests(server, 'GET'), macRequests(server, 'POST')],
    }).toEqual({
      off: hint,
      on: `${hint} To allow all commands on your Mac, use Allow all commands on this Mac in the Mac app.`,
      line: null,
      mac: [0, 0],
    })
  })
})
