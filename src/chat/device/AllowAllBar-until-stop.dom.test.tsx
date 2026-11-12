// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
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

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The settings of the Mac with the grant of the workspace until Stop. */
const untilStop = () => ({
  ...fakeMacSettings(),
  workspaceWindows: fakeMacSettings().workspaceWindows.map((grant) => ({
    ...grant,
    expiresAt: null,
  })),
})

/** The settings changes that the bar sent. */
async function sent(server: FakeApiServer): Promise<unknown[]> {
  return Promise.all(
    server.requests
      .filter((request) => request.method === 'POST')
      .map((request): Promise<unknown> => request.clone().json()),
  )
}

describe('AllowAllBar until Stop', () => {
  it('keeps the 15 minutes until Stop through the Mac, then shows Until you stop', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => FAKE_TIME }} fetch={server.fetch} />)
    await waitFor(() => queryByText('14:32 left'), 'the time left')
    server.json('POST', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStop()))
    await press(byRole('button', 'Keep until I stop'))
    await waitFor(() => queryByText('Until you stop'), 'the grant until Stop')
    expect(queryByText('14:32 left')).toBeNull()
    expect(queryByRole('button', 'Keep until I stop')).toBeNull()
    expect(queryByRole('button', 'Stop')).not.toBeNull()
    expect(await sent(server)).toEqual([
      {
        ...FAKE_PAIRING,
        operation: {
          action: 'keep-workspace',
          workspaceId: FAKE_IDS.workspace,
        },
      },
    ])
  })

  it('names a Keep that failed while the 15 minutes run, and never repeats it after they end', async () => {
    holdAnimationFrames()
    let time = FAKE_TIME
    const server = new FakeApiServer({ onMac: true })
    await mount(<Bar clock={{ now: () => time }} fetch={server.fetch} />)
    await waitFor(() => queryByText('14:32 left'), 'the time left')
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply(fakeMacSettings(), {
        status: 'failed',
        message: 'The Mac could not change this permission. Try again.',
      }),
    )
    await press(byRole('button', 'Keep until I stop'))
    await waitFor(
      () =>
        queryByRole(
          'alert',
          'Not kept The Mac could not change this permission. Try again.',
        ),
      'the failed Keep',
    )
    expect(queryByRole('button', 'Keep until I stop')).not.toBeNull()
    // The 15 minutes end: the bar goes, with no Try again of the Keep.
    time = FAKE_TIME + 15 * 60_000
    await waitFor(() => queryByLabel(BAR) === null, 'the end of the bar')
  })

  it('shows a grant until Stop without a time left, and stops it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(untilStop()))
    await mount(<Bar clock={{ now: () => FAKE_TIME }} fetch={server.fetch} />)
    await waitFor(() => queryByText('Until you stop'), 'the grant until Stop')
    expect(queryByRole('button', 'Keep until I stop')).toBeNull()
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
      'the stopped grant',
    )
  })
})
