// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { byRole } from '../../../test-support/dom-queries'
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
import { openTab } from '../wiring-test-kit'
import {
  frameOf as reportFrameOf,
  opened,
  pageOf,
  reportHref,
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

function pressEscape(): void {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
  })
}

describe('the expanded page of a tab', () => {
  test('Expand on a Preview tab shows its loaded frame in a window, and Close and Escape bring it back to the tab', async () => {
    holdAnimationFrames()
    const { view } = await openTab(
      new FakeApiServer(),
      previewPortHref(org, id, 3000),
    )
    const frame = await waitFor(() => portFrameOf(view), 'the page')

    click(byRole('button', 'Expand', view))
    await settle()
    const expanded = seenWindow(view, frame)
    click(byRole('button', 'Close', windowOf(view) ?? view))
    await settle()
    const closed = seenWindow(view, frame)
    click(byRole('button', 'Expand', view))
    await settle()
    pressEscape()
    await settle()
    expect({
      expanded,
      closed,
      escaped: windowOf(view),
      sameFrame: portFrameOf(view) === frame,
    }).toEqual({
      expanded: { name: 'Port 3000', holdsFrame: true, focus: 'Close' },
      closed: { name: null, holdsFrame: false, focus: 'Expand' },
      escaped: null,
      sameFrame: true,
    })
  })

  test('Expand on an HTML file shows its kept page in a window, which closes when its files preview ends', async () => {
    holdAnimationFrames()
    const server = serverWithReport()
    const { view } = await openTab(server, reportHref)
    const frame = await waitFor(() => reportFrameOf(view), 'the page')

    click(byRole('button', 'Expand', pageOf(view)))
    await settle()
    const expanded = seenWindow(view, frame)
    emit(server, { type: 'preview.revoked', previewId: opened.id })
    await settle()
    expect({
      expanded,
      afterRevoke: windowOf(view),
      sameFrame: reportFrameOf(view) === frame,
    }).toEqual({
      expanded: { name: 'report.html', holdsFrame: true, focus: 'Close' },
      afterRevoke: null,
      sameFrame: true,
    })
  })
})
