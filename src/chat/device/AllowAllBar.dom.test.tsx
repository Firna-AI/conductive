// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  byRole,
  queryByLabel,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
  fakeMacSettings,
} from '../../test-support/fixtures/devices'
import {
  holdAnimationFrames,
  mount,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import type { Clock } from '../ui/clock'
import { AllowAllBar } from './AllowAllBar'
import { useMacSettings } from './mac-settings'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const BAR = 'Commands that run without asking'

afterEach(() => {
  vi.useRealTimers()
})

/** One tick of the countdown: its interval fires once, and React renders. */
const tick = () =>
  act(async () => {
    vi.advanceTimersByTime(1_000)
  })

/** The bar with the settings controller of the window, as the app gives it. */
function Bar(props: { fetch: FakeApiServer['fetch']; clock: Clock }) {
  const { controller, state } = useMacSettings(props.fetch)
  return (
    <AllowAllBar
      clock={props.clock}
      controller={controller}
      state={state}
      workspaceId={FAKE_IDS.workspace}
    />
  )
}

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

  it('stops the 15 minutes of the workspace through the Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => FAKE_TIME }} fetch={server.fetch} />)
    await waitFor(() => queryByLabel(BAR), 'the bar')
    server.json('POST', DEVICE_SETTINGS_PATH, {
      ...FAKE_PAIRING,
      settings: { ...fakeMacSettings(), workspaceWindows: [] },
    })
    await press(byRole('button', 'Stop'))
    await waitFor(() => queryByLabel(BAR) === null, 'the stopped 15 minutes')
    const [sent] = server.requests.filter(
      (request) => request.method === 'POST',
    )
    expect(await sent.clone().json()).toEqual({
      ...FAKE_PAIRING,
      operation: { action: 'stop-workspace', workspaceId: FAKE_IDS.workspace },
    })
  })
})
