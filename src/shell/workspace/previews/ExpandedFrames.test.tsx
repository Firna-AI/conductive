// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { byLabel, byRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_IDS } from '../../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  waitFor,
} from '../../../test-support/mount'
import { click, settle } from '../../test-mount'
import { emit } from '../kept-test-kit'
import { previewPortHref } from '../tools/tool-address'
import { linkTo, openTab } from '../wiring-test-kit'
import {
  frameOf as reportFrameOf,
  opened,
  pageOf,
  reportHref,
  reportPath,
  serverWithReport,
} from './html-tab-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace: id } = FAKE_IDS
const portFrameOf = (view: HTMLElement) =>
  view.querySelector<HTMLIFrameElement>('iframe[title="Preview of port 3000"]')
const windowOf = (view: HTMLElement) =>
  view.querySelector<HTMLElement>('[role="dialog"]')

/** What the window shows: its name, the focus, and whether it holds the frame. */
function seenWindow(view: HTMLElement, frame: HTMLIFrameElement) {
  const window = windowOf(view)
  return {
    name: window?.getAttribute('aria-label') ?? null,
    holdsFrame: window?.contains(frame) ?? false,
    focus: document.activeElement?.getAttribute('aria-label') ?? null,
  }
}

/**
 * Shows the first session while the window shows, then shows `href` again.
 * Gives the window while the session shows and after the return.
 */
async function roundTrip(view: HTMLElement, href: string) {
  const row = byLabel('Sessions and files', view)
  click(byRole('button', 'Address autocomplete', row))
  await settle()
  const away = windowOf(view)
  click(linkTo(row, href))
  await settle()
  return { away, back: windowOf(view) }
}

function pressEscape(): void {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
}

describe('the expanded page of a tab', () => {
  test('Expand on a Preview tab shows its loaded frame in a window that keeps Tab, and Close, Escape, and another tab bring it back to the tab', async () => {
    holdAnimationFrames()
    const { view } = await openTab(
      new FakeApiServer(),
      previewPortHref(org, id, 3000),
    )
    const frame = await waitFor(() => portFrameOf(view), 'the page')

    click(byRole('button', 'Expand', view))
    await settle()
    const expanded = seenWindow(view, frame)
    // A press on the title gives the focus to the window itself.
    const box = windowOf(view)
    act(() => box?.focus())
    const backTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      box?.dispatchEvent(backTab)
    })
    const fromWindow = {
      kept: backTab.defaultPrevented,
      inWindow: box?.contains(document.activeElement) ?? false,
    }
    click(byRole('button', 'Close', windowOf(view) ?? view))
    await settle()
    const closed = seenWindow(view, frame)
    click(byRole('button', 'Expand', view))
    await settle()
    pressEscape()
    await settle()
    const escaped = windowOf(view)
    click(byRole('button', 'Expand', view))
    await settle()
    const trip = await roundTrip(view, previewPortHref(org, id, 3000))
    expect({
      expanded,
      fromWindow,
      closed,
      escaped,
      trip,
      sameFrame: portFrameOf(view) === frame,
    }).toEqual({
      expanded: { name: 'Port 3000', holdsFrame: true, focus: 'Close' },
      fromWindow: { kept: true, inWindow: true },
      closed: { name: null, holdsFrame: false, focus: 'Expand' },
      escaped: null,
      trip: { away: null, back: null },
      sameFrame: true,
    })
  })

  test('Expand on an HTML file shows its kept page in a window, which stays at a change of the file and closes at another tab and when its files preview ends', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view } = await openTab(server, reportHref)
    const frame = await waitFor(() => reportFrameOf(view), 'the page')

    click(byRole('button', 'Expand', pageOf(view)))
    await settle()
    const expanded = seenWindow(view, frame)
    emit(server, {
      type: 'files.changed',
      delta: {
        revision: 3,
        changes: [
          {
            operation: 'upsert',
            entry: {
              path: reportPath,
              name: reportPath,
              kind: 'file',
              change: null,
            },
          },
        ],
      },
    })
    await settle()
    const changed = reportFrameOf(view)
    const afterChange = {
      reloaded: changed !== null && changed !== frame,
      inWindow:
        changed !== null && (windowOf(view)?.contains(changed) ?? false),
    }
    const trip = await roundTrip(view, reportHref)
    click(byRole('button', 'Expand', pageOf(view)))
    await settle()
    emit(server, { type: 'preview.revoked', previewId: opened.id })
    await settle()
    expect({
      expanded,
      afterChange,
      trip,
      afterRevoke: windowOf(view),
      sameFrame: reportFrameOf(view) === changed,
    }).toEqual({
      expanded: { name: 'report.html', holdsFrame: true, focus: 'Close' },
      afterChange: { reloaded: true, inWindow: true },
      trip: { away: null, back: null },
      afterRevoke: null,
      sameFrame: true,
    })
  })
})
