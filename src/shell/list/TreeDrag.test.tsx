import type { Workspace } from '../../shared/generated/Workspace'
// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import sectionStyles from '../../ui/components/workspaces/SectionList.module.css'
import rowStyles from '../../ui/components/workspaces/WorkspaceRow.module.css'
import { groupWorkspaces } from '../../app/sections'
import { routes } from '../../app/router'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import type { MenuAnchor } from '../ui/menu-place'
import type { DropTarget } from './drop-target'
import type { RowMenu } from './row-menu'
import {
  closedMenu,
  layOut,
  mouse,
  noActions,
  rowLink,
} from './row-drag-test-kit'
import { SectionList } from './SectionList'

/** The list of Acme with the two trees of the mockups in Checkout. */
const trees = withSubWorkspaces(workspaceFixtures().workspaces.workspaces)

/** The rows of Checkout in their order, which the tests give 20 px each. */
const checkout = [
  'fix-cart-flake',
  'webhook-retries',
  'apple-pay',
  'merchant-validation',
  'wallet-button-tests',
  'checkout-autocomplete',
  'address-search-api',
  'places-client',
  'rate-limits',
  'rate-limit-load-test',
  'suggestion-list',
]

/** The workspace at an address of the app. */
function workspaceAt(href: string | null | undefined): string | null {
  return (
    trees.find((item) => routes.workspace(FAKE_IDS.org, item.id) === href)
      ?.id ?? null
  )
}

/**
 * The list with the trees, whose moves and opened menus the test reads.
 * Checkout spans 0 to 260 px, and its rows are 20 px high from 20 px. So
 * its trees span 20 to 40, 40 to 60, 60 to 120, and 120 to 240 px, with
 * their middles at 30, 50, 90, and 180 px.
 */
async function mountTrees() {
  const app = await startedApp(new FakeApiServer())
  const groups = groupWorkspaces(
    coreFixtures().sectionList.sections,
    trees,
    FAKE_TIME,
  )
  const moves: { workspaceId: string; target: DropTarget }[] = []
  const shown: { workspaceId: string; anchor: MenuAnchor }[] = []
  const menus = (workspace: Workspace): RowMenu => ({
    ...closedMenu,
    show: ({ anchor }) => shown.push({ workspaceId: workspace.id, anchor }),
  })
  const view = mountScreen(
    app,
    <SectionList
      actions={noActions}
      archived={groups.archived}
      groups={groups.sections}
      menus={menus}
      move={(workspaceId, target) => moves.push({ workspaceId, target })}
      now={FAKE_TIME}
      readOnly={false}
      selectedId={null}
      variant="sidebar"
    />,
  )
  layOut(view, 'Checkout', 0, checkout, 260)
  /** What the drop line says to a screen reader, while a drag lasts. */
  const status = () => view.querySelector('li [role="status"]')?.textContent
  return { view, moves, shown, status }
}

describe('the drag of a tree', () => {
  test('a drag of a top-level row lifts it with the count of its nested rows, leaves its tree faint, and drops the tree only between two trees', async () => {
    const { view, moves, status } = await mountTrees()
    mouse(rowLink(view, 'apple-pay'), 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 76 })
    const lifted = document.querySelector(`.${rowStyles.liftedTree}`)
    const faint = Array.from(
      view.querySelectorAll(`a.${rowStyles.placeholder}`),
      (link) => workspaceAt(link.getAttribute('href')),
    )
    const said = status()
    /** The row after the drop line, or null at the end of the section. */
    const lineBefore = () => {
      const line = view.querySelector(`li.${sectionStyles.drop}`)
      const next = line?.nextElementSibling?.querySelector('a')
      return line ? workspaceAt(next?.getAttribute('href')) : 'no line'
    }
    // Over Places API client, in the upper half of the last tree.
    mouse(window, 'pointermove', { clientY: 165 })
    const insideTree = lineBefore()
    // Over Rate limits: Load test, in the lower half of the last tree.
    mouse(window, 'pointermove', { clientY: 205 })
    const afterTree = lineBefore()
    mouse(window, 'pointerup', { clientY: 205, buttons: 0 })

    expect({
      lifted: {
        count: lifted?.querySelector(`.${rowStyles.moving}`)?.textContent,
        time: lifted?.querySelector(`.${rowStyles.time}`) ?? null,
      },
      faint,
      said,
      insideTree,
      afterTree,
      moves,
    }).toEqual({
      lifted: { count: '+2', time: null },
      faint: ['apple-pay', 'merchant-validation', 'wallet-button-tests'],
      said: 'Moving Apple Pay button and 2 sub-workspaces to Checkout',
      insideTree: 'checkout-autocomplete',
      afterTree: null,
      moves: [
        {
          workspaceId: 'apple-pay',
          target: { sectionId: 'checkout', index: 3 },
        },
      ],
    })
  })

  test('a nested row lifts nothing: a drag of a mouse moves nothing, and a long press of a finger opens no menu, while a right click opens it', async () => {
    const { view, moves, shown, status } = await mountTrees()
    mouse(rowLink(view, 'merchant-validation'), 'pointerdown', { clientY: 90 })
    mouse(window, 'pointermove', { clientY: 96 })
    mouse(window, 'pointermove', { clientY: 30 })
    const dragged = status()
    mouse(window, 'pointerup', { clientY: 30, buttons: 0 })
    const link = rowLink(view, 'places-client')
    const menuEvent = (x: number) =>
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: 170,
      })
    const finger = { pointerId: 2, pointerType: 'touch', clientY: 170 }
    mouse(link, 'pointerdown', finger)
    const hold = menuEvent(100)
    act(() => {
      link.dispatchEvent(hold)
    })
    mouse(window, 'pointercancel', { ...finger, buttons: 0 })
    const rightClick = menuEvent(120)
    act(() => {
      link.dispatchEvent(rightClick)
    })

    expect({
      dragged,
      moves,
      holdStopped: hold.defaultPrevented,
      rightClickStopped: rightClick.defaultPrevented,
      shown,
    }).toEqual({
      dragged: undefined,
      moves: [],
      holdStopped: true,
      rightClickStopped: true,
      shown: [{ workspaceId: 'places-client', anchor: { x: 120, y: 170 } }],
    })
  })
})
