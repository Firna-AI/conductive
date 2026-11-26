import type { Workspace } from '../../shared/generated/Workspace'
// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { groupWorkspaces } from '../../app/sections'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
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

describe('the drag of a workspace row', () => {
  test('moves to the section under the pointer and cancels outside the list, at its own place, or on Archive', async () => {
    const app = await startedApp(new FakeApiServer())
    const groups = groupWorkspaces(
      coreFixtures().sectionList.sections,
      workspaceFixtures().workspaces.workspaces,
      FAKE_TIME,
    )
    const moves: { workspaceId: string; target: DropTarget }[] = []
    const view = mountScreen(
      app,
      <SectionList
        actions={noActions}
        archiveAction={() => () => {}}
        archived={groups.archived}
        groups={groups.sections}
        move={(workspaceId, target) => moves.push({ workspaceId, target })}
        now={FAKE_TIME}
        readOnly={false}
        selectedId={null}
        variant="sidebar"
      />,
    )
    // General spans 0 to 100 px and Checkout 120 to 220 px. The middles of
    // their rows are at 30, 50, and 70 px, then 150, 170, 190, and 210 px.
    layOut(view, 'General', 0, [
      'email-dark-mode',
      'invoice-fonts',
      'pricing-copy',
    ])
    layOut(view, 'Checkout', 120, [
      'fix-cart-flake',
      'webhook-retries',
      'apple-pay',
      'checkout-autocomplete',
    ])
    const status = () => view.querySelector('li [role="status"]')?.textContent

    // Archive keeps its own press, so a press on it lifts no row.
    const pricing = rowLink(view, 'pricing-copy').closest('li')
    if (!pricing) throw new Error('The list has no row for pricing-copy.')
    const archive = byRole('button', 'Archive workspace', pricing)
    mouse(archive, 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 76 })
    mouse(window, 'pointermove', { clientY: 165 })
    const fromArchive = status()
    mouse(window, 'pointerup', { clientY: 165, buttons: 0 })
    // Invoice PDF fonts goes to Checkout, then back to its own place.
    mouse(rowLink(view, 'invoice-fonts'), 'pointerdown', { clientY: 50 })
    mouse(window, 'pointermove', { clientY: 56 })
    mouse(window, 'pointermove', { clientY: 165 })
    mouse(window, 'pointermove', { clientY: 52 })
    mouse(window, 'pointerup', { clientY: 52, buttons: 0 })
    // Pricing page copy goes to Checkout, then below every section.
    mouse(rowLink(view, 'pricing-copy'), 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 76 })
    mouse(window, 'pointermove', { clientY: 165 })
    const inCheckout = status()
    mouse(window, 'pointermove', { clientY: 240 })
    const outside = status()
    mouse(window, 'pointerup', { clientY: 240, buttons: 0 })
    expect(moves).toEqual([])
    // A release over Checkout moves the same row into that section.
    mouse(rowLink(view, 'pricing-copy'), 'pointerdown', { clientY: 70 })
    mouse(window, 'pointermove', { clientY: 165 })
    mouse(window, 'pointerup', { clientY: 165, buttons: 0 })

    expect({ fromArchive, inCheckout, outside, moves }).toEqual({
      fromArchive: undefined,
      inCheckout: 'Moving Pricing page copy to Checkout',
      outside: 'Moving Pricing page copy to General',
      moves: [
        {
          workspaceId: 'pricing-copy',
          target: { sectionId: 'checkout', index: 1 },
        },
      ],
    })
  })

  test('a finger that holds a row keeps its press for the drag and opens no menu, and a right click of a mouse opens the menu of the row at its pointer', async () => {
    const app = await startedApp(new FakeApiServer())
    const groups = groupWorkspaces(
      coreFixtures().sectionList.sections,
      workspaceFixtures().workspaces.workspaces,
      FAKE_TIME,
    )
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
        move={() => {}}
        now={FAKE_TIME}
        readOnly={false}
        selectedId={null}
        variant="sidebar"
      />,
    )
    const link = rowLink(view, 'apple-pay')
    const menuEvent = (x: number) =>
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: 190,
      })
    const finger = { pointerId: 2, pointerType: 'touch', clientY: 190 }
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
      holdStopped: hold.defaultPrevented,
      rightClickStopped: rightClick.defaultPrevented,
      shown,
    }).toEqual({
      holdStopped: true,
      rightClickStopped: true,
      shown: [{ workspaceId: 'apple-pay', anchor: { x: 120, y: 190 } }],
    })
  })
})
