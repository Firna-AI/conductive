// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { byLabel, byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { pressCommand } from '../shortcuts/shortcut-test-kit'
import { click } from '../test-mount'
import { useMenuLayer } from '../ui/layers'
import { openPaletteTab, palette } from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** An open menu whose change runs, so it refuses each request to close. */
function MenuDuringChange() {
  useMenuLayer(true, () => false)
  return null
}

describe('a layer that holds the input', () => {
  test('a menu that does not close, such as during its change, keeps the palette closed for the key and for the Search row', async () => {
    const { view } = await openPaletteTab(routes.org(org), {
      beside: <MenuDuringChange />,
    })
    const key = pressCommand('command-palette', 'other', document.body)
    const byKey = { open: palette() !== null, prevented: key.defaultPrevented }
    click(byRole('button', 'Search', byLabel('Workspaces', view)))
    expect({ byKey, byRow: palette() !== null }).toEqual({
      byKey: { open: false, prevented: false },
      byRow: false,
    })
  })

  test('on a phone, the palette key over the repository sheet of the palette leaves the sheet and the palette open', async () => {
    const { view } = await openPaletteTab(routes.org(org), {
      viewport: 'phone',
    })
    click(byRole('button', 'Search', view))
    click(byRole('tab', 'Workspaces'))
    click(byRole('button', 'All repositories', byRole('dialog', 'Search')))
    const opened = queryByRole('dialog', 'Repository') !== null
    const key = pressCommand('command-palette', 'other')
    expect({
      opened,
      sheet: queryByRole('dialog', 'Repository') !== null,
      palette: palette() !== null,
      prevented: key.defaultPrevented,
    }).toEqual({ opened: true, sheet: true, palette: true, prevented: false })
  })
})
