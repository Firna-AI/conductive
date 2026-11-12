import { act } from 'react'
import type { AppModel } from '../../app/app-model'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import { API_PATHS, type User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { accessibleName, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgRail } from './OrgRail'

// The helpers of the tests that mount the rail and move its org tiles.

/** The rail over the org list of the app, as `RailFrame` draws it. */
function Rail(props: { app: AppModel; user: User }) {
  const orgs = useStore(props.app.orgs)
  return (
    <OrgRail
      current={{ org: 'acme' }}
      firstRun={false}
      operator={false}
      orgs={orgs}
      user={props.user}
    />
  )
}

/** Serves the org list with new fields for one org, before the app starts. */
export function serveOrgChange(
  server: FakeApiServer,
  orgId: string,
  fields: Partial<OrgSummary>,
) {
  const { orgs } = coreFixtures().orgs
  server.json('GET', API_PATHS.orgs, {
    orgs: orgs.map((org) => (org.id === orgId ? { ...org, ...fields } : org)),
  })
}

/**
 * Mounts the rail of the fake API, with Acme open, and gives its address
 * bar and its frame. The rail starts as Acme, Futex, Firna.
 */
export async function mountRail(server: FakeApiServer) {
  const app = await startedApp(server)
  const boot = app.boot.get()
  if (boot.state !== 'ready') throw new Error('The app did not start.')
  const navigation = memoryNavigation(routes.org('acme'))
  const view = mountScreen(app, <Rail app={app} user={boot.user} />, {
    navigation,
  })
  return { navigation, view }
}

/** The link of the tile of an org. */
export function tileLink(view: HTMLElement, orgId: string): HTMLElement {
  const link = view.querySelector<HTMLElement>(`a[href="${routes.org(orgId)}"]`)
  if (!link) throw new Error(`The rail has no tile for ${orgId}.`)
  return link
}

/**
 * Gives the list item of each tile a box of 34 px, 7 px from the left of
 * the window and 40 px apart from the top, in this order. So the middles of
 * the tiles are at 17, 57, and 97 px.
 */
export function layOutTiles(view: HTMLElement, orgIds: readonly string[]) {
  orgIds.forEach((orgId, index) => {
    const item = tileLink(view, orgId).closest('li')
    if (!item) throw new Error(`The tile of ${orgId} has no list item.`)
    const box = new DOMRect(7, index * 40, 34, 34)
    Object.defineProperty(item, 'getBoundingClientRect', {
      configurable: true,
      value: () => box,
    })
  })
}

/** Sends a mouse event with the main button down, unless `init` says otherwise. */
export function mouse(
  target: EventTarget,
  type: string,
  init: PointerEventInit,
) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 24,
        ...init,
      }),
    )
  })
}

/** Sends a right click, and says whether the browser may show its own menu. */
export function rightClick(target: EventTarget, init: MouseEventInit): boolean {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    ...init,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return !event.defaultPrevented
}

/** What the status of the rail tells a screen reader. */
export function railStatus(view: HTMLElement): string {
  const status = view.querySelector('nav[aria-label="Orgs"] > [role="status"]')
  return status?.textContent ?? ''
}

/** The orgs of the org links of a list, the rail or a sheet, in their order. */
export function orgOrder(root: ParentNode): string[] {
  const prefix = routes.org('')
  const links = root.querySelectorAll<HTMLAnchorElement>('li > a')
  return Array.from(links, (link) => link.getAttribute('href') ?? '')
    .filter((href) => href.startsWith(prefix) && href !== routes.createOrg())
    .map((href) => href.slice(prefix.length))
}

/** The names that the rail can show beside its tiles, on hover or focus. */
export function railNames(view: HTMLElement): string[] {
  const names = view.querySelectorAll('li > span[aria-hidden="true"]')
  return Array.from(names, (name) => name.firstChild?.textContent ?? '')
}

/** The items of the open menu with this label, and whether each is off. */
export function menuItems(label: string): { name: string; off: boolean }[] {
  const menu = queryByRole('menu', label)
  if (!menu) return []
  return Array.from(menu.querySelectorAll('[role="menuitem"]'), (item) => ({
    name: accessibleName(item),
    off: item.matches(':disabled'),
  }))
}

/** Where the open menu with this label draws, from its own position. */
export function menuPlace(label: string): { left: string; top: string } {
  const menu = queryByRole('menu', label)?.parentElement
  return { left: menu?.style.left ?? '', top: menu?.style.top ?? '' }
}

/** The accessible name of the element with the focus, if any. */
export function focused(): string | null {
  const active = document.activeElement
  return active && active !== document.body ? accessibleName(active) : null
}

/** The org moves that the fake API got, as their bodies. */
export function orgMoves(server: FakeApiServer): Promise<unknown[]> {
  const moves = server.requests.filter(
    (request) =>
      request.method === 'PUT' &&
      new URL(request.url).pathname === API_PATHS.orgOrder,
  )
  return Promise.all(moves.map((request) => request.clone().json()))
}
