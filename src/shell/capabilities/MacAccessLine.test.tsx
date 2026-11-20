// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
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
import { textOf } from '../test-render'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  answerMacAccess,
  barLabel,
  boxState,
  hint,
  line,
  lineBox,
  macAccessText,
  macRequests,
  noGrants,
  openControl,
  path,
  pressLine,
  savedMacAccess,
  serverOf,
  settingsOf,
  start,
  stop,
  switchOf,
  switchState,
  untilStop,
  writesOf,
} from './mac-access-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Mac access in the Mac app', () => {
  test('a switch-on saves Mac access, then starts the grant until Stop of this Mac, so the line shows checked and the bar says Until you stop; a switch-off saves, then stops that grant', async () => {
    const server = serverOf({ macAccess: false, onMac: true })
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    const off = macAccessText(control)
    const from = server.requests.length
    const save = deferred<unknown>()
    server.json('PATCH', path, save.promise)
    click(switchOf(control))
    await settle()
    // While Mac access saves, no start goes to the Mac.
    expect(macRequests(server, 'POST')).toBe(0)
    save.resolve(savedMacAccess(true))
    await waitFor(() => lineBox(control)?.checked, 'the checked line')
    const on = {
      text: macAccessText(control),
      bar: textOf(byRole('region', barLabel, tab.view).innerHTML),
    }
    answerMacAccess(server, false)
    settingsOf(server, noGrants)
    click(switchOf(control))
    await waitFor(
      () => queryByRole('region', barLabel, tab.view) === null,
      'the end of the bar',
    )
    await settle()
    expect({
      off,
      on,
      line: lineBox(control),
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      off: `${hint} When you turn it on, this Mac also allows all commands until you stop.`,
      on: {
        text: `${line} Commands from this workspace run without asking, until you stop.`,
        bar: 'Every command from this workspace runs on this Mac without asking. Until you stop Stop',
      },
      line: null,
      writes: [
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
      ],
      changes: [
        { ...FAKE_PAIRING, operation: start },
        { ...FAKE_PAIRING, operation: stop },
      ],
    })
  })

  test('while the Stop of a switch-off waits on this Mac, the switch shows Mac access off and takes no switch-on, so no start drops, and once the Stop ends, a switch-on starts the grant until Stop', async () => {
    const server = serverOf({ macAccess: true, onMac: true })
    settingsOf(server, untilStop)
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(() => lineBox(control)?.checked, 'the checked line')
    const from = server.requests.length
    const posts = macRequests(server, 'POST')
    const stopped = deferred<unknown>()
    answerMacAccess(server, false)
    server.json('POST', DEVICE_SETTINGS_PATH, stopped.promise)
    click(switchOf(control))
    await waitFor(() => macRequests(server, 'POST') > posts, 'the Stop')
    await settle()
    const waiting = switchState(control)
    stopped.resolve(fakeSettingsReply(noGrants))
    await waitFor(() => !switchState(control).locked, 'the switch after Stop')
    answerMacAccess(server, true)
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(noGrants))
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStop))
    click(switchOf(control))
    await waitFor(() => lineBox(control)?.checked, 'the started grant')
    expect({
      waiting,
      writes: writesOf(server, from),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      waiting: { on: false, locked: true },
      writes: [
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
        `PATCH ${path}`,
        `POST ${DEVICE_SETTINGS_PATH}`,
      ],
      changes: [
        { ...FAKE_PAIRING, operation: stop },
        { ...FAKE_PAIRING, operation: start },
      ],
    })
  })

  test('a start that the Mac did not make keeps Mac access on, and shows Not started with its cause under the unchecked line, not on the bar or in a notice, and the line scrolls into view when a switch-on shows it and when the result shows, but not at the open', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    const server = serverOf({ macAccess: true, onMac: true })
    settingsOf(server, noGrants)
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    const opened = scroll.mock.contexts.length
    answerMacAccess(server, false)
    click(switchOf(control))
    await settle()
    settingsOf(server, noGrants, {
      status: 'failed',
      message: 'The Mac could not change this permission. Try again.',
    })
    const from = server.requests.length
    answerMacAccess(server, true)
    click(switchOf(control))
    await waitFor(
      () => macAccessText(control).includes('Not started'),
      'the result',
    )
    const shown = lineBox(control)?.closest('div')
    expect({
      opened,
      scrolls: scroll.mock.contexts.filter((element) => element === shown)
        .length,
      mac: switchOf(control).getAttribute('aria-checked'),
      box: boxState(lineBox(control)),
      text: macAccessText(control),
      bar: queryByRole('region', barLabel, tab.view),
      notice: queryByText('Could not allow all commands on this Mac'),
      writes: writesOf(server, from),
    }).toEqual({
      opened: 0,
      scrolls: 2,
      mac: 'true',
      box: { checked: false, off: false },
      text: `${line} Commands from this workspace run without asking, until you stop. Not started The Mac could not change this permission. Try again.`,
      bar: null,
      notice: null,
      writes: [`PATCH ${path}`, `POST ${DEVICE_SETTINGS_PATH}`],
    })
  })

  test('while the 15 minutes run, the line stays unchecked and its hint gives the time left; a check keeps them until Stop, and an uncheck stops the grant and shows Stopped under the line', async () => {
    const server = serverOf({ macAccess: true, onMac: true })
    const tab = await openTab(server, { macApp: true })
    const control = await openControl(tab.view)
    await waitFor(
      () => macAccessText(control).includes('left'),
      'the time left',
    )
    const fifteen = {
      box: boxState(lineBox(control)),
      text: macAccessText(control),
    }
    const from = server.requests.length
    pressLine(control)
    await waitFor(() => lineBox(control)?.checked, 'the checked line')
    const kept = macAccessText(control)
    settingsOf(server, noGrants)
    pressLine(control)
    await waitFor(
      () => macAccessText(control).includes('Stopped'),
      'the result of the Stop',
    )
    expect({
      fifteen,
      kept,
      box: boxState(lineBox(control)),
      stopped: macAccessText(control),
      changes: await bodiesOf(server, 'POST', DEVICE_SETTINGS_PATH, from),
    }).toEqual({
      fifteen: {
        box: { checked: false, off: false },
        text: `${line} 14:32 left of the 15 minutes. Check this to keep them until you stop.`,
      },
      kept: `${line} Commands from this workspace run without asking, until you stop.`,
      box: { checked: false, off: false },
      stopped: `${line} Commands from this workspace run without asking, until you stop. Stopped Each command from this workspace asks first.`,
      changes: [
        { ...FAKE_PAIRING, operation: start },
        { ...FAKE_PAIRING, operation: stop },
      ],
    })
  })
})
