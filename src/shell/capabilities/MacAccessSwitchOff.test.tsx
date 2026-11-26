// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
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
  reopenControl,
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

// A switch-off is never kept waiting. It takes back a start or a Keep of
// the grant of this Mac that waits, so that change never takes effect, and
// its Stop always goes, also after a change that is already on its way to
// the Mac.

/**
 * Waits until the Mac got a change after the first `posts` and the switch
 * takes a change again, so no change of the grant waits any more, then
 * lets the last reply show.
 */
async function changesEnd(
  server: FakeApiServer,
  control: HTMLElement,
  posts: number,
): Promise<void> {
  await waitFor(
    () => macRequests(server, 'POST') > posts && !switchState(control).locked,
    'the end of the changes of the grant',
  )
  await settle()
}

describe('a switch-off of Mac access while a change of the grant of this Mac waits', () => {
  test('takes back a start that waits for its read of this Mac, so the start never goes, and its Stop ends the 15 minutes', async () => {
    const server = serverOf({ onMac: true })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => !switchState(control).locked, 'the settings')
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const posts = macRequests(server, 'POST')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'GET') > gets, 'the start read')
    const starting = switchState(control)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    click(switchOf(control))
    await settle()
    const stopping = switchState(control)
    // The Mac still lists the 15 minutes, because no change reached it yet.
    read.resolve(fakeSettingsReply())
    await changesEnd(server, control, posts)
    expect({
      starting,
      stopping,
      mac: switchState(control),
      text: macAccessText(control),
      bar: barText(tab.view),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      starting: { on: true, locked: false },
      stopping: { on: false, locked: true },
      mac: { on: false, locked: false },
      text: `Mac access ${stopped}`,
      bar: stopped,
      writes: [`POST ${DEVICE_SETTINGS_PATH}`],
      changes: [{ ...FAKE_PAIRING, operation: stop }],
    })
  })

  test('sends its Stop after a start that is already on its way to this Mac, so the grant that the start makes ends', async () => {
    const server = serverOf({ onMac: true })
    settingsOf(server, noGrants)
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => !switchState(control).locked, 'the settings')
    const from = server.requests.length
    const posts = macRequests(server, 'POST')
    const started = deferred<unknown>()
    server.json('POST', DEVICE_SETTINGS_PATH, started.promise)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'POST') > posts, 'the start')
    click(switchOf(control))
    await settle()
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    // The Mac made the start, so its reply lists the grant until Stop.
    started.resolve(fakeSettingsReply(untilStop))
    await changesEnd(server, control, posts)
    expect({
      mac: switchState(control),
      text: macAccessText(control),
      bar: barText(tab.view),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      mac: { on: false, locked: false },
      text: `Mac access ${stopped}`,
      bar: stopped,
      changes: [
        { ...FAKE_PAIRING, operation: start },
        { ...FAKE_PAIRING, operation: stop },
      ],
    })
  })

  test('takes back a Keep of the bar that waits behind a read of this Mac, which shows the switch on, and its Stop ends the 15 minutes', async () => {
    const server = serverOf({ onMac: true })
    const tab = await openTab(server, { macApp: true })
    await openControl(tab.view)
    await waitFor(
      () => queryByRole('button', 'Keep until I stop', tab.view),
      'the Keep of the 15 minutes',
    )
    const from = server.requests.length
    const gets = macRequests(server, 'GET')
    const posts = macRequests(server, 'POST')
    const read = deferred<unknown>()
    server.json('GET', DEVICE_SETTINGS_PATH, read.promise)
    // The control reads this Mac again as it opens, and that read waits.
    const control = await reopenControl(tab.view)
    await waitFor(() => macRequests(server, 'GET') > gets, 'the read again')
    click(byRole('button', 'Keep until I stop', tab.view))
    await settle()
    const keeping = switchState(control)
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    click(switchOf(control))
    await settle()
    // The Mac still lists the 15 minutes, because no change reached it yet.
    read.resolve(fakeSettingsReply())
    await changesEnd(server, control, posts)
    expect({
      keeping,
      mac: switchState(control),
      text: macAccessText(control),
      bar: barText(tab.view),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      keeping: { on: true, locked: false },
      mac: { on: false, locked: false },
      text: `Mac access ${stopped}`,
      bar: stopped,
      writes: [`POST ${DEVICE_SETTINGS_PATH}`],
      changes: [{ ...FAKE_PAIRING, operation: stop }],
    })
  })
})
