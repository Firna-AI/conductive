// @vitest-environment happy-dom

import { expect, test } from 'vitest'
import { routes } from '../../app/router'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { serverWith } from '../new-workspace/dialog-test-kit'
import { click, settle } from '../test-mount'
import { openPaletteTab, palette, pressPaletteKey } from './palette-test-kit'

test('New workspace in the palette opens the saved dialog over the current page', async () => {
  holdAnimationFrames()
  const { org } = FAKE_IDS
  const { navigation } = await openPaletteTab(routes.org(org), {
    server: serverWith('dialog'),
  })
  pressPaletteKey('other', document.body)
  const row = byRole('option', 'New workspace')
  const href = row.getAttribute('href')
  click(row)
  await settle()
  expect({
    href,
    address: navigation.href(),
    palette: palette() !== null,
    dialog: queryByRole('dialog', 'New workspace') !== null,
  }).toEqual({
    href: routes.newWorkspace(org),
    address: routes.org(org),
    palette: false,
    dialog: true,
  })
})
