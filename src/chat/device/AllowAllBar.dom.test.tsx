// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEVICE_CURRENT_PATH, DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  byRole,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
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

describe('AllowAllBar', () => {
  it('counts down the 15 minutes of the workspace from the end time of the Mac, and goes when they end', async () => {
    holdAnimationFrames()
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let time = FAKE_TIME
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => time }} fetch={server.fetch} />)
    await waitFor(() => queryByText('14:32 left'), 'the time left')
    time = FAKE_TIME + 14 * 60_000 + 31_000
    await tick()
    expect(queryByText('0:01 left')).not.toBeNull()
    time += 1_000
    await tick()
    expect(queryByLabel(BAR)).toBeNull()
  })

  it('stops the 15 minutes of the workspace through the Mac, and says so after they end', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => FAKE_TIME }} fetch={server.fetch} />)
    await waitFor(() => queryByLabel(BAR), 'the bar')
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({ ...fakeMacSettings(), workspaceWindows: [] }),
    )
    await press(byRole('button', 'Stop'))
    await waitFor(
      () =>
        queryByRole(
          'status',
          'Stopped Each command from this workspace asks first.',
        ),
      'the stopped 15 minutes',
    )
    expect(queryByRole('button', 'Stop')).toBeNull()
    expect(queryByText('14:32 left')).toBeNull()
    const [sent] = server.requests.filter(
      (request) => request.method === 'POST',
    )
    expect(await sent.clone().json()).toEqual({
      ...FAKE_PAIRING,
      operation: { action: 'stop-workspace', workspaceId: FAKE_IDS.workspace },
    })
  })

  it('keeps a failed Stop and a Stop that the Mac did not save, after the 15 minutes end and when a new pairing shows them again, until the next Stop', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    let controller: MacSettingsController | undefined
    await mount(
      <Bar
        clock={{ now: () => FAKE_TIME }}
        fetch={server.fetch}
        found={(found) => {
          controller = found
        }}
      />,
    )
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
    expect(queryByText('14:32 left')).not.toBeNull()

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
    expect(queryByRole('alert', `Not stopped ${failed}`)).toBeNull()
    expect(queryByRole('button', 'Stop')).toBeNull()
    expect(queryByText('14:32 left')).toBeNull()
    const retry = 'Try again to stop Checkout address autocomplete'
    expect(queryByRole('button', retry)).not.toBeNull()

    // The Mac connects again, and its saved settings still hold the grant.
    const next = { ...FAKE_PAIRING, connectionId: 'connection-2' }
    server.json('GET', DEVICE_CURRENT_PATH, { device: next })
    server.json('GET', DEVICE_SETTINGS_PATH, {
      ...fakeSettingsReply(fakeMacSettings()),
      ...next,
    })
    await act(() => controller?.refresh())
    expect(queryByText('14:32 left')).not.toBeNull()
    expect(queryByRole('button', retry)).toBeNull()
    expect(queryByRole('alert', `Stopped, not saved ${unsaved}`)).not.toBeNull()

    server.json('POST', DEVICE_SETTINGS_PATH, {
      ...fakeSettingsReply({ ...fakeMacSettings(), workspaceWindows: [] }),
      ...next,
    })
    await press(byRole('button', 'Stop'))
    await waitFor(
      () =>
        queryByRole(
          'status',
          'Stopped Each command from this workspace asks first.',
        ),
      'the Stop that the Mac saved',
    )
    expect(queryByRole('alert', `Stopped, not saved ${unsaved}`)).toBeNull()
  })
})
