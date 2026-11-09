// @vitest-environment happy-dom

import { act } from 'react'
import { expect, test } from 'vitest'
import { routes } from '../../app/router'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { placeOf, serverWith } from '../new-workspace/dialog-test-kit'
import { click, settle } from '../test-mount'
import { openPaletteTab, palette, pressPaletteKey } from './palette-test-kit'

test('New workspace in the palette opens the saved dialog over the current page, also over Create org for the org that the tab opened last', async () => {
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
  // Create org stands alone, without the rail, and has no org of its own.
  act(() => navigation.push(routes.createOrg()))
  await settle()
  pressPaletteKey('other', document.body)
  click(byRole('option', 'New workspace'))
  await settle()
  const dialog = queryByRole('dialog', 'New workspace')
  expect({
    address: navigation.href(),
    palette: palette() !== null,
    place: dialog === null ? null : placeOf(dialog),
  }).toEqual({
    address: routes.createOrg(),
    palette: false,
    place: 'Acme · General',
  })
})
