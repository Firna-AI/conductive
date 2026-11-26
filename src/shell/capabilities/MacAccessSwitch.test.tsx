// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { queryByText } from '../../test-support/dom-queries'
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
  barText,
  macAccessText,
  macRequests,
  noGrants,
  openControl,
  serverOf,
  settingsOf,
  start,
  stop,
  stopped,
  switchOf,
  switchState,
  untilStop,
  writesOf,
} from './mac-access-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const cause = 'The Mac could not change this permission. Try again.'

describe('the switch of Mac access in the Mac app', () => {
  test('is off with no hint while the 15 minutes run; a switch-on starts the grant until Stop of this Mac with no save in the workspace, so it shows on and the bar says Until you stop; a switch-off stops the grant and shows Stopped under it', async () => {
    const server = serverOf({ onMac: true })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => !switchState(control).locked, 'the settings')
    const fifteen = {
      mac: switchState(control),
      text: macAccessText(control),
      bar: barText(tab.view),
    }
    const from = server.requests.length
    settingsOf(server, untilStop)
    click(switchOf(control))
    const starting = switchState(control)
    await waitFor(
      () => barText(tab.view)?.includes('Until you stop'),
      'the grant until Stop',
    )
    const on = { mac: switchState(control), text: macAccessText(control) }
    settingsOf(server, noGrants)
    click(switchOf(control))
    await waitFor(
      () => macAccessText(control).includes('Stopped'),
      'the result of the Stop',
    )
    expect({
      fifteen,
      starting,
      on,
      off: { mac: switchState(control), text: macAccessText(control) },
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      fifteen: {
        mac: { on: false, locked: false },
        text: 'Mac access',
        bar: 'Every command from this workspace runs on this Mac without asking. 14:32 left Keep until I stop Stop',
      },
      starting: { on: true, locked: false },
      on: { mac: { on: true, locked: false }, text: 'Mac access' },
      off: { mac: { on: false, locked: false }, text: `Mac access ${stopped}` },
      writes: [`POST ${DEVICE_SETTINGS_PATH}`, `POST ${DEVICE_SETTINGS_PATH}`],
      changes: [
        { ...FAKE_PAIRING, operation: start },
        { ...FAKE_PAIRING, operation: stop },
      ],
    })
  })

  test('is off with no hint while this Mac has no grant, and shows Not started and the cause of a start that the Mac did not make under the switch, which turns off again, and not on the bar or in a notice', async () => {
    const server = serverOf({ onMac: true })
    settingsOf(server, noGrants, { status: 'failed', message: cause })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => !switchState(control).locked, 'the settings')
    const off = { mac: switchState(control), text: macAccessText(control) }
    click(switchOf(control))
    await waitFor(
      () => macAccessText(control).includes('Not started'),
      'the result',
    )
    expect({
      off,
      mac: switchState(control),
      text: macAccessText(control),
      bar: barText(tab.view),
      notice: queryByText('Could not allow all commands on this Mac'),
    }).toEqual({
      off: { mac: { on: false, locked: false }, text: 'Mac access' },
      mac: { on: false, locked: false },
      text: `Mac access Not started ${cause}`,
      bar: null,
      notice: null,
    })
  })

  test('shows off and takes no switch-on while the Stop of a switch-off waits on this Mac, and once the Stop ends, a switch-on starts the grant until Stop', async () => {
    const server = serverOf({ onMac: true })
    settingsOf(server, untilStop)
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => switchState(control).on, 'the switch on')
    const from = server.requests.length
    const posts = macRequests(server, 'POST')
    const held = deferred<unknown>()
    server.json('POST', DEVICE_SETTINGS_PATH, held.promise)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'POST') > posts, 'the Stop')
    await settle()
    const waiting = switchState(control)
    held.resolve(fakeSettingsReply(noGrants))
    await waitFor(() => !switchState(control).locked, 'the end of the Stop')
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStop))
    click(switchOf(control))
    await waitFor(
      () => barText(tab.view)?.includes('Until you stop'),
      'the started grant',
    )
    expect({
      waiting,
      mac: switchState(control),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      waiting: { on: false, locked: true },
      mac: { on: true, locked: false },
      changes: [
        { ...FAKE_PAIRING, operation: stop },
        { ...FAKE_PAIRING, operation: start },
      ],
    })
  })
})
