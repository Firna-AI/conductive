// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { serveWork } from '../../test-support/fake-bar'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import type { Platform } from '../../app/services'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import { settle } from '../test-mount'
import type { Viewport } from '../ui/viewport'
import { filesHref } from '../workspace/files/files-address'
import { socketsOf } from '../workspace/wiring-test-kit'
import { pressCommand } from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS
const checksHref = filesHref(org, workspace, { kind: 'list', list: 'checks' })
const label = `W-${workspaceFixtures().detail.workspace.number}`

/** The tooltip of a control, and the key that it names to a screen reader. */
function hintOf(control: HTMLElement) {
  return {
    tooltip: control.closest('[title]')?.getAttribute('title') ?? null,
    name: control.getAttribute('aria-keyshortcuts'),
  }
}

/**
 * The hints of an open workspace in a Chrome tab: the tooltip and the key
 * name of New session in the tab row, the tooltip of the label of the
 * number in the header, and the key and the key name of the New workspace
 * row of the open palette. On the Checks tab, the tooltip and the key name
 * of Merge, and of the link to the pull request: its number in the desktop
 * bar, and Open on GitHub at the top of the tab on a phone.
 */
async function hintsOf(platform: Platform, viewport: Viewport) {
  holdAnimationFrames()
  const server = new FakeApiServer()
  serveWork(server, 'none')
  const { view, navigation } = await openPaletteTab(
    routes.workspace(org, workspace),
    { platform, viewport, server, events: socketsOf(server).events },
  )
  const control = hintOf(byRole('button', 'New session', view))
  const copyLink = hintOf(byRole('button', `Copy link to ${label}`, view))
  pressCommand('command-palette', platform, document.body)
  const option = byRole('option', 'New workspace')
  const row = {
    keys: option.querySelector('kbd')?.textContent ?? null,
    name: option.getAttribute('aria-keyshortcuts'),
  }
  const opened = palette() !== null
  pressCommand('command-palette', platform, document.body)
  act(() => navigation.push(checksHref))
  await settle()
  const link =
    viewport === 'phone' ? 'Open on GitHub' : 'Open pull request #482 on GitHub'
  return {
    control,
    copyLink,
    row,
    palette: opened,
    merge: hintOf(byRole('button', 'Squash and merge', view)),
    pullRequest: hintOf(byRole('link', link, view)),
  }
}

describe('the key hints', () => {
  test('a palette row and a tooltip show the first key of the command that works in a Chrome tab', async () => {
    // A Chrome tab keeps ⌘T and ⌘N, so the hints show the second keys.
    expect(await hintsOf('mac', 'desktop')).toEqual({
      control: { tooltip: 'New session (⌥⌘T)', name: 'Alt+Meta+T' },
      copyLink: {
        tooltip: `Copy link to ${label} (⇧⌘C)`,
        name: 'Shift+Meta+C',
      },
      row: { keys: '⌥⌘N', name: 'Alt+Meta+N' },
      palette: true,
      merge: { tooltip: 'Squash and merge (⇧⌘M)', name: 'Shift+Meta+M' },
      pullRequest: {
        tooltip: 'Open pull request #482 on GitHub (⇧⌘G)',
        name: 'Shift+Meta+G',
      },
    })
  })

  test('the phone layout shows no hint, and its keys still run', async () => {
    expect(await hintsOf('other', 'phone')).toEqual({
      control: { tooltip: null, name: null },
      copyLink: { tooltip: null, name: null },
      row: { keys: null, name: null },
      palette: true,
      merge: { tooltip: null, name: null },
      pullRequest: { tooltip: 'Open on GitHub', name: null },
    })
  })
})
