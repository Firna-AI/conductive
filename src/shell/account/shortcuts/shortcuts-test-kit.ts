import { routes } from '../../../app/router'
import { ACCOUNT_PATHS } from '../../../shared/account'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import {
  accessibleName,
  byRole,
  byText,
} from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { coreFixtures } from '../../../test-support/fixtures/core'
import { openPaletteTab } from '../../palette/palette-test-kit'

// The helpers of the tests of the Keyboard shortcuts tab.

/** A change of a command as the account sends it, with its key text. */
interface SentChange {
  readonly command: ShortcutCommandId
  readonly keys: readonly string[]
}

/**
 * The whole app at the Keyboard shortcuts tab, in a Chrome tab on a Mac,
 * over the fake API. `changes` are the saved changes of the Mac keyboard.
 */
export async function openShortcutsTab(changes: readonly SentChange[] = []) {
  const server = new FakeApiServer()
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    shortcuts: { mac: changes, other: [] },
  })
  const tab = await openPaletteTab(routes.accountTab('shortcuts'), {
    platform: 'mac',
    server,
  })
  return { ...tab, server }
}

/** The next reply of a save: the confirmed changes of the Mac keyboard. */
export function replyWith(
  server: FakeApiServer,
  changes: readonly SentChange[],
): void {
  server.json('PUT', ACCOUNT_PATHS.shortcuts, { keyboard: 'mac', changes })
}

/** The bodies of the saves that the tab sent, in their order. */
export async function savesOf(server: FakeApiServer): Promise<unknown[]> {
  const saves = server.requests.filter(
    (request) =>
      request.method === 'PUT' &&
      new URL(request.url).pathname === ACCOUNT_PATHS.shortcuts,
  )
  return Promise.all(saves.map((request) => request.clone().json()))
}

/** The row of a command or of a fixed key in a group, by its label. */
export function rowOf(group: string, label: string): HTMLElement {
  const row = byText(label, byRole('list', group)).closest('li')
  if (!row) throw new Error(`${label} has no row.`)
  return row
}

/** The names of the buttons of a row, in their order. */
export function controlsOf(row: HTMLElement): string[] {
  return Array.from(row.querySelectorAll<HTMLElement>('*'))
    .filter(
      (element) =>
        (element.getAttribute('role') ??
          (element.tagName === 'BUTTON' ? 'button' : null)) === 'button',
    )
    .map(accessibleName)
}

/** What the lines under the keys of a row say, as a screen reader reads them. */
export function linesOf(row: HTMLElement): string[] {
  return Array.from(row.querySelectorAll('p'), accessibleName)
}
