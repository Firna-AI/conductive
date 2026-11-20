// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import {
  FAKE_PAIRING,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import {
  deferred,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../test-support/mount'
import { openTab } from '../new-workspace/dialog-test-kit'
import { click, settle } from '../test-mount'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  answerMacAccess,
  barLabel,
  boxState,
  line,
  lineBox,
  macAccessOff,
  macAccessText,
  macRequests,
  noGrants,
  openControl,
  path,
  pressLine,
  reopenControl,
  savedMacAccess,
  serverOf,
  start,
  stop,
  switchOf,
  switchState,
  untilStop,
  writesOf,
} from './mac-access-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

// A switch-off ends the period of Mac access of the workspace (Mac access
// decision 6 C). So a start or a Keep of the grant of this Mac that the
// member asked for before it must never take effect in a later period,
// such as after another member turns Mac access on again, and the Stop of
// the switch-off always goes.

/** The line while Mac access is on, this Mac is current, and no grant runs. */
const lineOn = `${line} Commands from this workspace run without asking, until you stop.`

describe('a switch-off of Mac access while a start or a Keep of the grant of this Mac waits', () => {
  test('takes the start back while it waits for its read, so the switch takes a switch-on at once, and the start never goes, also once another member turns Mac access on again', async () => {
    const server = serverOf({ macAccess: false, onMac: true })
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    answerMacAccess(server, true)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'GET') > gets, 'the start read')
    answerMacAccess(server, false)
    click(switchOf(control))
    await settle()
    const off = switchState(control)
    read.resolve(fakeSettingsReply(noGrants))
    // Another member turns Mac access on, and the control reads it again.
    server.json('GET', path, savedMacAccess(true))
    const reopened = await reopenControl(tab.view)
    await waitFor(() => macRequests(server, 'GET') > gets + 1, 'a read again')
    await settle()
    expect({
      off,
      box: boxState(lineBox(reopened)),
      text: macAccessText(reopened),
      bar: queryByRole('region', barLabel, tab.view),
      writes: writesOf(server, from),
    }).toEqual({
      off: { on: false, locked: false },
      box: { checked: false, off: false },
      text: lineOn,
      bar: null,
      writes: [`PATCH ${path}`, `PATCH ${path}`],
    })
  })

  test('lets a later switch-on start the grant once, while the start that the switch-off took back still waits for its read', async () => {
    const server = serverOf({ macAccess: false, onMac: true })
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStop))
    answerMacAccess(server, true)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'GET') > gets, 'the start read')
    answerMacAccess(server, false)
    click(switchOf(control))
    await settle()
    answerMacAccess(server, true)
    click(switchOf(control))
    await settle()
    read.resolve(fakeSettingsReply(noGrants))
    await waitFor(() => macRequests(server, 'POST') > 0, 'the start')
    await settle()
    expect({
      box: boxState(lineBox(control)),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      box: { checked: true, off: false },
      writes: [
        `PATCH ${path}`,
        `PATCH ${path}`,
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
      ],
      changes: [{ ...FAKE_PAIRING, operation: start }],
    })
  })

  test('keeps no result of a start that was on its way to this Mac, so the refusal of Mac access off never shows under the line once another member turns Mac access on again', async () => {
    const server = serverOf({ macAccess: false, onMac: true })
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    const from = server.requests.length
    const refused = deferred<unknown>()
    server.json('POST', DEVICE_SETTINGS_PATH, refused.promise, 403)
    answerMacAccess(server, true)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'POST') > 0, 'the start')
    answerMacAccess(server, false)
    click(switchOf(control))
    await settle()
    const gets = macRequests(server, 'GET')
    refused.resolve(macAccessOff)
    await waitFor(() => macRequests(server, 'GET') > gets, 'the read after it')
    // Another member turns Mac access on, and the control reads it again.
    server.json('GET', path, savedMacAccess(true))
    const reopened = await reopenControl(tab.view)
    await waitFor(() => lineBox(reopened), 'the line')
    await settle()
    expect({
      box: boxState(lineBox(reopened)),
      text: macAccessText(reopened),
      writes: writesOf(server, from),
    }).toEqual({
      box: { checked: false, off: false },
      text: lineOn,
      writes: [
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
        `PATCH ${path}`,
      ],
    })
  })

  test('still sends the Stop of the switch-off while the 15 minutes run, and no start, so the bar ends', async () => {
    const server = serverOf({ macAccess: true, onMac: true })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => macAccessText(control).includes('left'), 'the time')
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    pressLine(control)
    await waitFor(() => macRequests(server, 'GET') > gets, 'the start read')
    answerMacAccess(server, false)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    click(switchOf(control))
    await settle()
    // The Mac still lists the 15 minutes, because no Stop reached it yet.
    read.resolve(fakeSettingsReply())
    await waitFor(
      () => queryByRole('region', barLabel, tab.view) === null,
      'the end of the bar',
    )
    await settle()
    expect({
      mac: switchState(control),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      mac: { on: false, locked: false },
      writes: [`PATCH ${path}`, `POST ${DEVICE_SETTINGS_PATH}`],
      changes: [{ ...FAKE_PAIRING, operation: stop }],
    })
  })

  test('takes back a Keep of the bar that waits behind a read of this Mac, and still sends the Stop, so the Keep never goes and the bar ends', async () => {
    const server = serverOf({ macAccess: true, onMac: true })
    const tab = await openTab(server, { macApp: true })
    await openControl(tab.view)
    await waitFor(
      () => queryByRole('button', 'Keep until I stop', tab.view),
      'the Keep of the 15 minutes',
    )
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    // The control reads this Mac again as it opens, and that read waits.
    const control = await reopenControl(tab.view)
    await waitFor(() => macRequests(server, 'GET') > gets, 'the read again')
    click(byRole('button', 'Keep until I stop', tab.view))
    await settle()
    answerMacAccess(server, false)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    click(switchOf(control))
    await settle()
    // The Mac still lists the 15 minutes, because no change reached it yet.
    read.resolve(fakeSettingsReply())
    await waitFor(
      () => queryByRole('region', barLabel, tab.view) === null,
      'the end of the bar',
    )
    await settle()
    expect({
      mac: switchState(control),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      mac: { on: false, locked: false },
      writes: [`PATCH ${path}`, `POST ${DEVICE_SETTINGS_PATH}`],
      changes: [{ ...FAKE_PAIRING, operation: stop }],
    })
  })
})
