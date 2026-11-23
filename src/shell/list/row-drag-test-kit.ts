import { act } from 'react'
import { beforeEach, vi } from 'vitest'
import { routes } from '../../app/router'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import type { RowMenu } from './row-menu'
import type { SectionActions } from './SectionHeader'

// The helpers of the tests that drag the rows of a list in happy-dom,
// which lays out no box, so a test gives each box its place.

const placed = new Set<Element>()
beforeEach(() => {
  placed.clear()
  const hit = vi.spyOn(document, 'elementFromPoint').mockImplementation(
    (x, y) =>
      [...placed].findLast((element) => {
        const { left, right, top, bottom } = element.getBoundingClientRect()
        return (
          element.isConnected &&
          x >= left &&
          x <= right &&
          y >= top &&
          y <= bottom
        )
      }) ?? null,
  )
  return () => hit.mockRestore()
})

/** The menu of a row, closed. */
export const closedMenu: RowMenu = {
  open: false,
  show: () => {},
  rename: null,
  startRename: null,
}

export const noActions: SectionActions = {
  toggle: () => {},
  rename: () => {},
  moveTo: () => {},
  newWorkspace: () => {},
  newSection: () => {},
  remove: () => {},
}

/** The link of the row of a workspace. */
export function rowLink(view: HTMLElement, workspaceId: string): HTMLElement {
  const found = view.querySelector<HTMLElement>(
    `a[href="${routes.workspace(FAKE_IDS.org, workspaceId)}"]`,
  )
  if (!found) throw new Error(`The list has no row for ${workspaceId}.`)
  return found
}

/** Gives an element a box `height` px high, `top` px down the page. */
export function placeAt(element: Element | null, top: number, height: number) {
  if (!element) throw new Error('The list has no element to place.')
  placed.add(element)
  const box = new DOMRect(0, top, 200, height)
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => box,
  })
}

/**
 * Gives a section a box `height` px high from `top`, 100 px by default, and
 * each of its rows a box 20 px high, in this order, from 20 px below the
 * top of the section.
 */
export function layOut(
  view: HTMLElement,
  section: string,
  top: number,
  workspaceIds: readonly string[],
  height = 100,
) {
  placeAt(view.querySelector(`section[aria-label="${section}"]`), top, height)
  workspaceIds.forEach((workspaceId, index) =>
    placeAt(
      rowLink(view, workspaceId).parentElement,
      top + 20 + index * 20,
      20,
    ),
  )
}

/** Sends a mouse event with the button down, unless `init` says otherwise. */
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
        clientX: 100,
        ...init,
      }),
    )
  })
}
