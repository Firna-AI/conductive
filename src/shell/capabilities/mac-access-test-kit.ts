import { DEVICE_SETTINGS_PATH, type DeviceSettings } from '../../shared/device'
import { secretsPath, workspaceCapabilitiesPath } from '../../shared/secrets'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { id, org } from '../workspace/kept-test-kit'

// The helpers of the tests of the switch of Mac access in the Capabilities
// control of a workspace, in the Mac app and in a browser.

const { secrets, grants } = secretFixtures()

/** The route of the Capabilities of the fake workspace. */
const path = workspaceCapabilitiesPath(org, id)

const barLabel = 'Commands that run without asking'

/** The settings of the fake Mac with no grant of any workspace. */
export const noGrants: DeviceSettings = {
  ...fakeMacSettings(),
  workspaceWindows: [],
}

/** The settings of the fake Mac with the grant until Stop of the workspace. */
export const untilStop: DeviceSettings = {
  ...fakeMacSettings(),
  workspaceWindows: fakeMacSettings().workspaceWindows.map((grant) => ({
    ...grant,
    expiresAt: null,
  })),
}

export const start = { action: 'start-workspace-until-stop', workspaceId: id }
export const stop = { action: 'stop-workspace', workspaceId: id }

/** The words under the switch after a Stop that the Mac made and saved. */
export const stopped = 'Stopped Each command from this workspace asks first.'

/**
 * The fake API with the secrets of Acme and the Capabilities of the
 * workspace. The stored Mac access of the workspace is off, because it
 * gates nothing, so the switch must not follow it. With `onMac`, the
 * window has a device connection, and its Mac holds the 15 minutes of the
 * workspace.
 */
export function serverOf(options: { onMac: boolean }): FakeApiServer {
  const server = new FakeApiServer({ onMac: options.onMac })
  server.json('GET', secretsPath(org), { secrets })
  server.json('GET', path, { capabilities: { ...grants, macAccess: false } })
  return server
}

/** The Mac lists `settings` at each read and after the next change. */
export function settingsOf(
  server: FakeApiServer,
  settings: DeviceSettings,
  outcome?: { status: 'failed'; message: string },
): void {
  server.json('GET', DEVICE_SETTINGS_PATH, fakeSettingsReply(settings))
  server.json(
    'POST',
    DEVICE_SETTINGS_PATH,
    fakeSettingsReply(settings, outcome),
  )
}

/** The open Capabilities control of the workspace. */
export async function openControl(view: HTMLElement): Promise<HTMLElement> {
  click(byRole('button', 'Capabilities', view))
  await settle()
  return byRole('dialog', 'Capabilities', view)
}

/**
 * Closes the open control with a second press of its tool, then opens it
 * again, so it reads the settings of this Mac again.
 */
export async function reopenControl(view: HTMLElement): Promise<HTMLElement> {
  click(byRole('button', 'Capabilities', view))
  await settle()
  return openControl(view)
}

/** The Mac access part of the control, as a person reads it. */
export const macAccessText = (control: HTMLElement) =>
  textOf(byRole('region', 'Mac access', control).innerHTML)

export const switchOf = (control: HTMLElement) =>
  byRole('switch', 'Mac access', control)

/**
 * What the switch of Mac access shows: its value, and whether it takes no
 * change.
 */
export function switchState(control: HTMLElement) {
  const shown = switchOf(control)
  return {
    on: shown.getAttribute('aria-checked') === 'true',
    locked: shown.getAttribute('aria-disabled') === 'true',
  }
}

/** The bar of the grant at the top of the workspace, as a person reads it. */
export function barText(view: HTMLElement): string | null {
  const bar = queryByRole('region', barLabel, view)
  return bar ? textOf(bar.innerHTML) : null
}

/** The writes of the page from `from` on, each as its method and path. */
export function writesOf(server: FakeApiServer, from: number): string[] {
  return server.requests
    .slice(from)
    .filter((request) => request.method !== 'GET')
    .map((request) => `${request.method} ${new URL(request.url).pathname}`)
}

/** How many requests to the settings of this Mac the page sent. */
export const macRequests = (server: FakeApiServer, method: 'GET' | 'POST') =>
  server.requests.filter(
    (request) =>
      request.method === method &&
      new URL(request.url).pathname === DEVICE_SETTINGS_PATH,
  ).length
