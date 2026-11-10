// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import type { Platform } from '../../app/services'
import { openPaletteTab, palette } from '../palette/palette-test-kit'
import type { Viewport } from '../ui/viewport'
import { socketsOf } from '../workspace/wiring-test-kit'
import { pressCommand } from './shortcut-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org, workspace } = FAKE_IDS

/**
 * The hints of an open workspace in a Chrome tab: the tooltip and the key
 * name of New session in the tab row, and the key and the key name of the
 * New workspace row of the open palette.
 */
async function hintsOf(platform: Platform, viewport: Viewport) {
  holdAnimationFrames()
  const server = new FakeApiServer()
  const { view } = await openPaletteTab(routes.workspace(org, workspace), {
    platform,
    viewport,
    server,
    events: socketsOf(server).events,
  })
  const button = byRole('button', 'New session', view)
  const control = {
    tooltip: button.closest('[title]')?.getAttribute('title') ?? null,
    name: button.getAttribute('aria-keyshortcuts'),
  }
  pressCommand('command-palette', platform, document.body)
  const option = byRole('option', 'New workspace')
  const row = {
    keys: option.querySelector('kbd')?.textContent ?? null,
    name: option.getAttribute('aria-keyshortcuts'),
  }
  return { control, row, palette: palette() !== null }
}

describe('the key hints', () => {
  test('a palette row and a tooltip show the first key of the command that works in a Chrome tab', async () => {
    // A Chrome tab keeps ⌘T and ⌘N, so the hints show the second keys.
    expect(await hintsOf('mac', 'desktop')).toEqual({
      control: { tooltip: 'New session (⌥⌘T)', name: 'Alt+Meta+T' },
      row: { keys: '⌥⌘N', name: 'Alt+Meta+N' },
      palette: true,
    })
  })

  test('the phone layout shows no hint, and its keys still run', async () => {
    expect(await hintsOf('other', 'phone')).toEqual({
      control: { tooltip: null, name: null },
      row: { keys: null, name: null },
      palette: true,
    })
  })
})
