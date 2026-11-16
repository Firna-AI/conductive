import { vi } from 'vitest'
import { routes } from '../../app/router'
import { byLabel, byRole, queryByLabel } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { click } from '../test-mount'

// The helpers of the tests of the list popover of the org tile.

/** The tile of an org in the rail. */
export function tile(view: HTMLElement, name: string): HTMLElement {
  return byRole('link', name, byLabel('Orgs', view))
}

/** The sidebar of the frame, also while it is hidden. */
export function sidebar(view: HTMLElement): HTMLElement | null {
  return view.querySelector<HTMLElement>('aside[aria-label="Workspaces"]')
}

/** The sidebar of the frame shows. */
export function sidebarShows(view: HTMLElement): boolean {
  const aside = sidebar(view)
  return aside !== null && !aside.hidden
}

/** Hides the sidebar with its toggle beside the Settings cog. */
export function hideSidebar(view: HTMLElement): void {
  click(byRole('button', 'Hide the sidebar', sidebar(view) ?? view))
}

/** The list popover, while it is open. */
export function popover(): HTMLElement | null {
  return queryByLabel('Workspace list')
}

/** The open list popover, or a failure. */
export function openPopover(): HTMLElement {
  const list = popover()
  if (!list) throw new Error('The popover is not open.')
  return list
}

/** The row of a workspace of Acme in `list`. */
export function rowOf(list: HTMLElement, workspaceId: string): HTMLElement {
  const row = list.querySelector<HTMLElement>(
    `a[href="${routes.workspace(FAKE_IDS.org, workspaceId)}"]`,
  )
  if (!row) throw new Error(`The list has no row of ${workspaceId}.`)
  return row
}

/** Presses the pointer on `target`, as a mouse does before a click. */
export function pointerDown(target: EventTarget): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
}

/** Where the focus is: the tile, the page body, or another element. */
export function focusOf(tileLink: HTMLElement): string {
  const active = document.activeElement
  if (active === tileLink) return 'tile'
  if (active === null || active === document.body) return 'body'
  return 'elsewhere'
}

/** Makes the window narrower than 900 px, where the sidebar hides. */
export function narrowWindow(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('max-width: 899px'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  )
}
