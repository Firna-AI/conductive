import { DEVICE_SETTINGS_PATH, type DeviceSettings } from '../../shared/device'
import { secretsPath, workspaceCapabilitiesPath } from '../../shared/secrets'
import { byRole, queryByLabel } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  fakeMacSettings,
  fakeSettingsReply,
} from '../../test-support/fixtures/devices'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { click, settle } from '../test-mount'
import { textOf } from '../test-render'
import { id, org } from '../workspace/kept-test-kit'

// The helpers of the tests of Mac access in the Capabilities control of a
// workspace, in the Mac app and in a browser.

const { secrets, grants } = secretFixtures()

/** The route of the Capabilities of the fake workspace. */
export const path = workspaceCapabilitiesPath(org, id)

export const barLabel = 'Commands that run without asking'

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

/** The title and the hint of Mac access, in a browser or while it is on. */
export const hint =
  'Mac access Lets agents ask to run commands on the Mac of the member who sent the message.'

/** The part up to the hint of the line of this Mac. */
export const line = `${hint} Allow all commands on this Mac`

export const start = { action: 'start-workspace-until-stop', workspaceId: id }
export const stop = { action: 'stop-workspace', workspaceId: id }

/**
 * The fake API with the secrets of Acme and the Capabilities of the
 * workspace, whose Mac access is `macAccess`. With `onMac`, the window has
 * a device connection.
 */
export function serverOf(options: {
  macAccess: boolean
  onMac: boolean
}): FakeApiServer {
  const server = new FakeApiServer({ onMac: options.onMac })
  server.json('GET', secretsPath(org), { secrets })
  server.json('GET', path, {
    capabilities: { ...grants, macAccess: options.macAccess },
  })
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

/** The answer of the next save of Mac access: the capabilities with `on`. */
export const savedMacAccess = (on: boolean) => ({
  capabilities: { ...grants, macAccess: on },
})

/** The next switch of Mac access saves `on`. */
export function answerMacAccess(server: FakeApiServer, on: boolean): void {
  server.json('PATCH', path, savedMacAccess(on))
}

/** The refusal of the Worker of a start while Mac access is off. */
export const macAccessOff = {
  error: {
    code: 'mac_access_off',
    message: 'Mac access is off in the Capabilities of this workspace.',
  },
}

/** The open Capabilities control of the workspace. */
export async function openControl(view: HTMLElement): Promise<HTMLElement> {
  click(byRole('button', 'Capabilities', view))
  await settle()
  return byRole('dialog', 'Capabilities', view)
}

/**
 * Closes the open control with a second press of its tool, then opens it
 * again, so it reads Mac access and the settings of this Mac again.
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

/** The box of the line of this Mac, or null while no line shows. */
export function lineBox(control: HTMLElement): HTMLInputElement | null {
  const box = queryByLabel('Allow all commands on this Mac', control)
  return box instanceof HTMLInputElement ? box : null
}

export const boxState = (box: HTMLInputElement | null) =>
  box ? { checked: box.checked, off: box.disabled } : null

/** Presses the box of the line, which must show. */
export function pressLine(control: HTMLElement): void {
  const box = lineBox(control)
  if (!box) throw new Error('No line of this Mac shows.')
  click(box)
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
