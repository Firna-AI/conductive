// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  byRole,
  queryByLabel,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { Bar, BAR } from './allow-all-bar-test-kit'
import type { MacSettingsController } from './mac-settings'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

afterEach(() => {
  vi.useRealTimers()
})

/** One tick of the countdown: its interval fires once, and React renders. */
const tick = () =>
  act(async () => {
    vi.advanceTimersByTime(1_000)
  })

describe('the Stop result of AllowAllBar', () => {
  it('takes away a Stop that the Mac made and saved after 5 seconds, also in a new mount, and a new Stop shows again', async () => {
    holdAnimationFrames()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let time = FAKE_TIME
    const clock = { now: () => time }
    const server = new FakeApiServer({ onMac: true })
    let controller: MacSettingsController | undefined
    const bar = (barKey: string) => (
      <Bar
        barKey={barKey}
        clock={clock}
        fetch={server.fetch}
        found={(found) => {
          controller = found
        }}
      />
    )
    const view = await mount(bar('first'))
    await waitFor(() => queryByLabel(BAR), 'the bar')
    const stopped = () =>
      queryByRole(
        'status',
        'Stopped Each command from this workspace asks first.',
      )
    const noGrant = fakeSettingsReply({
      ...fakeMacSettings(),
      workspaceWindows: [],
    })
    server.json('POST', DEVICE_SETTINGS_PATH, noGrant)
    await press(byRole('button', 'Stop'))
    await waitFor(stopped, 'the stopped 15 minutes')
    time += 4_000
    await tick()
    expect(stopped()).not.toBeNull()
    time += 1_000
    await tick()
    expect(queryByLabel(BAR)).toBeNull()

    // A return to the workspace and a read again keep the gone Stop away.
    await view.rerender(bar('again'))
    expect(queryByLabel(BAR)).toBeNull()
    server.json('GET', DEVICE_SETTINGS_PATH, noGrant)
    await act(() => controller?.refresh())
    expect(queryByLabel(BAR)).toBeNull()

    // A new Stop shows again, also when the Mac has no grant to stop.
    await act(() =>
      controller?.change({
        action: 'stop-workspace',
        workspaceId: FAKE_IDS.workspace,
      }),
    )
    expect(stopped()).not.toBeNull()
  })

  it('keeps a failed Stop and a Stop that the Mac did not save after 5 seconds', async () => {
    holdAnimationFrames()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let time = FAKE_TIME
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => time }} fetch={server.fetch} />)
    await waitFor(() => queryByLabel(BAR), 'the bar')
    const failed = 'The Mac could not change this permission. Try again.'
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply(fakeMacSettings(), {
        status: 'failed',
        message: failed,
      }),
    )
    await press(byRole('button', 'Stop'))
    await waitFor(
      () => queryByRole('alert', `Not stopped ${failed}`),
      'the failed Stop',
    )
    time += 6_000
    await tick()
    expect(queryByRole('alert', `Not stopped ${failed}`)).not.toBeNull()

    const unsaved =
      'This permission change is active, but the Mac could not save it. Try again.'
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply(
        { ...fakeMacSettings(), workspaceWindows: [] },
        { status: 'done-not-saved', message: unsaved },
      ),
    )
    await press(byRole('button', 'Stop'))
    await waitFor(
      () => queryByRole('alert', `Stopped, not saved ${unsaved}`),
      'the Stop that the Mac did not save',
    )
    time += 6_000
    await tick()
    expect({
      alert: queryByRole('alert', `Stopped, not saved ${unsaved}`) !== null,
      retry:
        queryByRole(
          'button',
          'Try again to stop Checkout address autocomplete',
        ) !== null,
    }).toEqual({ alert: true, retry: true })
  })
})
