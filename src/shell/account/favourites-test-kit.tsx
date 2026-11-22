import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { HeldRequests } from '../../app/test-kit'
import { ACCOUNT_PATHS, type AccountResponse } from '../../shared/account'
import {
  accessibleName,
  byLabel,
  byRole,
  queryByRole,
} from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { fakeUser } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import type { Viewport } from '../ui/viewport'
import { AccountScreen } from './AccountScreen'

// The favourites of the account of the fake API, which are the starting
// favourites of the mockups, in their order.
export const opusHigh: AgentChoice = {
  agent: 'claude',
  model: 'Opus 5.5',
  effort: 'high',
  fast: false,
}
export const opusMax: AgentChoice = { ...opusHigh, effort: 'max' }
export const sonnetMedium: AgentChoice = {
  agent: 'claude',
  model: 'Sonnet 5.5',
  effort: 'medium',
  fast: false,
}
export const solHigh: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'high',
  fast: false,
}
export const astraMedium: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6 Astra',
  effort: 'medium',
  fast: false,
}

export const favouritesPath = ACCOUNT_PATHS.favourites

/** The words of the error of a failed save, under the list. */
export const notSaved = "The change wasn't saved. Try again."

/**
 * The Preferences tab of the account of the fake API, mounted in the layout
 * of `viewport`, with `account` in place of the account of the fake API
 * when it is given.
 */
export async function mountFavourites(
  server: FakeApiServer,
  account?: AccountResponse,
  viewport: Viewport = 'desktop',
) {
  holdAnimationFrames()
  if (account) server.json('GET', ACCOUNT_PATHS.account, account)
  const held = new HeldRequests(server)
  const app = await startedApp(server, { fetch: held.fetch })
  const view = mountScreen(
    app,
    <OverlayHost>
      <AccountScreen connect={null} tab="preferences" user={fakeUser} />
    </OverlayHost>,
    { viewport },
  )
  return { view, held }
}

/**
 * The server answers each save of the favourites with the list that it
 * got, as the Worker does for a list without copies.
 */
export function echoSaves(server: FakeApiServer): void {
  server.handle('PUT', favouritesPath, async (request) =>
    Response.json(await request.json()),
  )
}

/**
 * The bodies of the saves of the favourites that the app sent, in order.
 * It reads copies, so a test can read them more than once.
 */
export async function sentSaves(server: FakeApiServer): Promise<unknown[]> {
  const saves = server.requests.filter(
    (request) =>
      request.method === 'PUT' &&
      new URL(request.url).pathname === favouritesPath,
  )
  return Promise.all(saves.map((request) => request.clone().json()))
}

/** The list of the favourites. */
export function favouritesList(view: HTMLElement): HTMLElement {
  return byLabel('Favourites', view)
}

/** The rows of the list, without the drop line of a drag. */
export function rowElements(view: HTMLElement): HTMLElement[] {
  return Array.from(
    favouritesList(view).querySelectorAll<HTMLElement>(':scope > li'),
  ).filter((row) => row.getAttribute('aria-hidden') !== 'true')
}

/**
 * Each row as a screen reader reads it: the choice that its picker names,
 * such as "Opus 5.5, High", and the line under a hidden favourite.
 */
export function favouriteRows(view: HTMLElement): string[] {
  return rowElements(view).map((row) => {
    const picker = row.querySelector('[aria-haspopup="menu"]')
    const name = picker
      ? accessibleName(picker).replace('Model and effort: ', '')
      : ''
    const line = Array.from(
      row.querySelectorAll('span'),
      (span) => span.textContent ?? '',
    ).find((text) => text.startsWith('Hidden from the model menu'))
    return line === undefined ? name : `${name} / ${line}`
  })
}

/** The picker of the row at `place`. */
export function pickerAt(view: HTMLElement, place: number): HTMLElement {
  const picker = rowElements(view)[place]?.querySelector<HTMLElement>(
    '[aria-haspopup="menu"]',
  )
  if (!picker) throw new Error(`No picker at place ${place}.`)
  return picker
}

/** × of the favourite that the row names, such as "Opus 5.5 High". */
export function removeButton(view: HTMLElement, name: string): HTMLElement {
  return byRole('button', `Remove ${name}`, view)
}

/** What a screen reader hears about the last move of a row. */
export function moveStatus(view: HTMLElement): string {
  const status =
    favouritesList(view).parentElement?.querySelector('[role="status"]')
  return status?.textContent ?? ''
}

/** The error of a failed save under the list, or null. */
export function saveError(view: HTMLElement): string | null {
  return queryByRole('alert', notSaved, view)?.textContent ?? null
}
