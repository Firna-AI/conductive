import { memoryNavigation } from '../../app/navigation'
import { windowKeys, type AppServices, type Platform } from '../../app/services'
import { Store } from '../../app/store'
import {
  accessibleName,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MacApp, type MacWindowState } from '../mac/mac-app'
import { Shell } from '../Shell'
import { mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { recordingSocket } from '../workspace/kept-test-kit'

// The helpers of the tests of the command palette in the whole app.

/** A window of the Mac app that does not move, for the frame of the Mac app. */
const macWindow = {
  state: new Store<MacWindowState>({
    mode: 'window',
    canGoBack: false,
    canGoForward: false,
  }),
  back: () => undefined,
  forward: () => undefined,
}

/**
 * The whole app in a tab at `href`, over the fake API, or in the Mac app
 * with `mac`. The app hears the keys of the window, as the browser gives
 * them.
 */
export async function openPaletteTab(
  href: string,
  options: {
    platform?: Platform
    viewport?: Viewport
    server?: FakeApiServer
    events?: AppServices['events']
    mac?: boolean
  } = {},
) {
  const server = options.server ?? new FakeApiServer()
  const app = await startedApp(server, {
    onKey: windowKeys(window),
    platform: options.platform ?? 'other',
    events: options.events ?? recordingSocket(server).source,
  })
  const navigation = memoryNavigation(href)
  const shell = options.mac ? (
    <MacApp window={macWindow}>
      <Shell />
    </MacApp>
  ) : (
    <Shell />
  )
  const view = mountScreen(app, shell, {
    navigation,
    viewport: options.viewport ?? 'desktop',
  })
  await settle()
  return { app, server, view, navigation }
}

/** The palette, or null while it is closed. */
export function palette(): HTMLElement | null {
  return queryByRole('dialog', 'Search')
}

/** The search field of the open palette. */
export function searchField(): HTMLInputElement {
  const field = byRole('combobox', 'Search')
  if (!(field instanceof HTMLInputElement)) {
    throw new Error('The search field is not a text field.')
  }
  return field
}

/** Presses the palette key of the platform, by default on the focused element. */
export function pressPaletteKey(
  platform: Platform,
  target: EventTarget = document.activeElement ?? document.body,
): KeyboardEvent {
  return press(
    target,
    'k',
    platform === 'mac' ? { meta: true } : { ctrl: true },
  )
}

/** The options of the results, in their order. */
export function options(): HTMLElement[] {
  const list = queryByRole('listbox', 'Results')
  if (!list) return []
  return Array.from(list.querySelectorAll<HTMLElement>('[role="option"]'))
}

/** The labels of the groups of the results, in their order. */
export function groupLabels(): string[] {
  const list = queryByRole('listbox', 'Results')
  if (!list) return []
  return Array.from(list.querySelectorAll('[role="group"]'), accessibleName)
}

/** The option that Enter runs: the one that the search field names. */
export function highlighted(): HTMLElement | null {
  const id = searchField().getAttribute('aria-activedescendant')
  return id === null ? null : document.getElementById(id)
}

/** What the open palette says in place of its results. */
export function status(): string | null {
  return palette()?.querySelector('[role="status"]')?.textContent ?? null
}
