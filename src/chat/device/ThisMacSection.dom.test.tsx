// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { DEVICE_SETTINGS_PATH } from '../../shared/device'
import {
  byLabel,
  byRole,
  queryByLabel,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  FAKE_PAIRING,
  fakeLiteralCommands,
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
import { ThisMacSection } from './ThisMacSection'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const clock = { now: () => FAKE_TIME }
const settings = fakeMacSettings()

/** The bodies of the setting changes that the section sent. */
function changes(server: FakeApiServer): Promise<unknown[]> {
  return Promise.all(
    server.requests
      .filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === DEVICE_SETTINGS_PATH,
      )
      .map((request): Promise<unknown> => request.clone().json()),
  )
}

describe('ThisMacSection', () => {
  it('removes one exact command and stops the 15 minutes of one workspace through the Mac', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    await mount(
      <ThisMacSection clock={clock} fetch={server.fetch} viewport="desktop" />,
    )
    await waitFor(() => queryByText("Cal's MacBook Pro"), 'the name of the Mac')
    const commands = () =>
      Array.from(
        byLabel('Always allowed commands').querySelectorAll('code'),
        (code) => code.textContent,
      )
    expect(commands()).toEqual(['git status', 'npm run lint', 'sw_vers'])
    expect(queryByText('14:32 left')).not.toBeNull()

    const kept = ['git status', 'sw_vers']
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({ ...settings, alwaysAllowedCommands: kept }),
    )
    await press(byRole('button', 'Remove npm run lint'))
    await waitFor(
      () => queryByRole('button', 'Remove npm run lint') === null,
      'the list without the removed command',
    )
    expect(commands()).toEqual(kept)

    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({
        ...settings,
        alwaysAllowedCommands: kept,
        workspaceWindows: [],
      }),
    )
    await press(byRole('button', 'Stop Checkout address autocomplete'))
    await waitFor(
      () =>
        queryByText(
          'Allow all commands for 15 minutes in a request adds its workspace here.',
        ),
      'the list without the stopped 15 minutes',
    )
    expect(await changes(server)).toEqual([
      {
        ...FAKE_PAIRING,
        operation: { action: 'remove-command', command: 'npm run lint' },
      },
      {
        ...FAKE_PAIRING,
        operation: {
          action: 'stop-workspace',
          workspaceId: FAKE_IDS.workspace,
        },
      },
    ])
  })

  it('names a removal that the Mac made but did not save, after the command leaves the list, until Try again saves it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    await mount(
      <ThisMacSection clock={clock} fetch={server.fetch} viewport="desktop" />,
    )
    await waitFor(() => queryByText("Cal's MacBook Pro"), 'the name of the Mac')
    const unsaved =
      'This permission change is active, but the Mac could not save it. Try again.'
    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply(
        { ...settings, alwaysAllowedCommands: ['git status', 'sw_vers'] },
        { status: 'done-not-saved', message: unsaved },
      ),
    )
    await press(byRole('button', 'Remove npm run lint'))
    await waitFor(
      () => queryByRole('button', 'Remove npm run lint') === null,
      'the list without the removed command',
    )
    const notSaved = `Removed, not saved npm run lint ${unsaved}`
    expect(queryByRole('alert', notSaved)).not.toBeNull()

    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({ ...settings, alwaysAllowedCommands: ['git status'] }),
    )
    await press(byRole('button', 'Remove sw_vers'))
    await waitFor(
      () => queryByRole('button', 'Remove sw_vers') === null,
      'the list without sw_vers',
    )
    expect(queryByRole('status', 'Removed sw_vers')).not.toBeNull()
    expect(queryByRole('alert', notSaved)).not.toBeNull()

    server.json(
      'POST',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({ ...settings, alwaysAllowedCommands: ['git status'] }),
    )
    await press(byRole('button', 'Try again to remove npm run lint'))
    await waitFor(
      () => queryByRole('status', 'Removed npm run lint'),
      'the removal that the Mac saved',
    )
    expect(queryByRole('alert', notSaved)).toBeNull()
    expect((await changes(server)).at(-1)).toEqual({
      ...FAKE_PAIRING,
      operation: { action: 'remove-command', command: 'npm run lint' },
    })
  })

  it('shows each saved command literally, with a mark for each line feed and hidden character', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ onMac: true })
    server.json(
      'GET',
      DEVICE_SETTINGS_PATH,
      fakeSettingsReply({
        ...settings,
        alwaysAllowedCommands: [...fakeLiteralCommands],
      }),
    )
    await mount(
      <ThisMacSection clock={clock} fetch={server.fetch} viewport="desktop" />,
    )
    await waitFor(
      () => queryByLabel('Always allowed commands'),
      'the saved commands',
    )
    const saved = Array.from(
      byLabel('Always allowed commands').querySelectorAll<HTMLElement>('code'),
      (code) => ({
        text: code.textContent,
        whiteSpace: code.style.whiteSpace,
        marks: Array.from(
          code.querySelectorAll('[data-literal-code]'),
          (mark) => mark.getAttribute('data-literal-code'),
        ),
      }),
    )
    expect(saved).toEqual([
      {
        text: fakeLiteralCommands[0],
        whiteSpace: 'pre-wrap',
        marks: ['U+000A'],
      },
      {
        text: fakeLiteralCommands[1],
        whiteSpace: 'pre-wrap',
        marks: ['U+00A0'],
      },
    ])
  })

  it('says when the Mac is not available, and loads the settings again after a failed read', async () => {
    holdAnimationFrames()
    const browser = new FakeApiServer()
    const away = await mount(
      <ThisMacSection clock={clock} fetch={browser.fetch} viewport="desktop" />,
    )
    await waitFor(
      () =>
        queryByText(
          'Agents can run commands here again once this Mac connects.',
        ),
      'the state of a Mac that is not connected',
    )
    expect(queryByText('Not available')).not.toBeNull()
    await away.unmount()

    const server = new FakeApiServer({ onMac: true })
    const failed = {
      code: 'relay_failed',
      message: 'The Mac did not answer. Try again.',
    }
    server.json('GET', DEVICE_SETTINGS_PATH, { error: failed }, 502)
    await mount(
      <ThisMacSection clock={clock} fetch={server.fetch} viewport="desktop" />,
    )
    await waitFor(() => queryByText('This Mac did not load'), 'the failed read')
    expect(queryByText('The Mac did not answer. Try again.')).not.toBeNull()
    server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(settings))
    await press(byRole('button', 'Try again'))
    await waitFor(
      () => queryByText("Cal's MacBook Pro"),
      'the settings after Try again',
    )
  })
})
