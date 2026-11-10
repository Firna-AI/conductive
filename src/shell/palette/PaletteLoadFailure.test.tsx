// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { orgSettingsPaths } from '../../shared/org-settings'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle, typeText } from '../test-mount'
import {
  groupLabels,
  highlighted,
  openPaletteTab,
  options,
  pressPaletteKey,
  searchField,
  status,
} from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const listPath = workspacesPath(org)
const repositoriesPath = orgSettingsPaths.repositories(org)
const failure = "The workspaces didn't load"
const busy = { error: { code: 'unavailable', message: 'The service is busy.' } }

/** The reads of a path of Acme that the fake API got. */
function reads(server: FakeApiServer, path: string): number {
  return requestLines(server).filter((line) => line === `GET ${path}`).length
}

describe('the Workspaces tab of the palette', () => {
  test('a list that did not load shows the failure with Try again, which reads the list again and shows its workspaces', async () => {
    const server = new FakeApiServer()
    // The first read fails, before any read of the list succeeds.
    server.json('GET', listPath, busy, 503)
    await openPaletteTab(routes.org(org), { server })
    pressPaletteKey('other', document.body)
    click(byRole('tab', 'Workspaces'))
    const palette = byRole('dialog', 'Search')
    expect({
      title: queryByText(failure, palette) !== null,
      retry: queryByRole('button', 'Try again', palette) !== null,
    }).toEqual({ title: true, retry: true })
    const readsBefore = reads(server, listPath)
    server.json('GET', listPath, workspaceFixtures().workspaces)
    click(byRole('button', 'Try again', palette))
    await settle()
    expect({
      newListReads: reads(server, listPath) - readsBefore,
      groups: groupLabels(),
      rows: options().map((option) => option.getAttribute('href')),
    }).toEqual({
      newListReads: 1,
      groups: ['General', 'Checkout', 'Infra'],
      rows: [
        'email-dark-mode',
        'invoice-fonts',
        'pricing-copy',
        'fix-cart-flake',
        'webhook-retries',
        'apple-pay',
        'checkout-autocomplete',
        'next-16',
        'retry-queue',
      ].map((id) => routes.workspace(org, id)),
    })
  })
})

describe('the All tab of the palette', () => {
  test('a search while the list and the repositories did not load shows the failure of the list first, keeps the actions that match, and Try again reads both again', async () => {
    const server = new FakeApiServer()
    server.json('GET', listPath, busy, 503)
    server.json('GET', repositoriesPath, busy, 503)
    await openPaletteTab(routes.org(org), { server })
    pressPaletteKey('other', document.body)
    typeText(searchField(), 'to')
    const palette = byRole('dialog', 'Search')
    // The status part is not a row: the first action is highlighted.
    expect({
      title: queryByText(failure, palette) !== null,
      retry: queryByRole('button', 'Try again', palette) !== null,
      noMatch: status(),
      groups: groupLabels(),
      highlighted: highlighted()?.getAttribute('href'),
    }).toEqual({
      title: true,
      retry: true,
      noMatch: null,
      groups: ['Actions', 'Settings'],
      highlighted: routes.org('futex'),
    })
    const readsBefore = {
      list: reads(server, listPath),
      repositories: reads(server, repositoriesPath),
    }
    server.json('GET', listPath, workspaceFixtures().workspaces)
    server.json('GET', repositoriesPath, coreFixtures().repositories)
    click(byRole('button', 'Try again', palette))
    await settle()
    expect({
      newReads: {
        list: reads(server, listPath) - readsBefore.list,
        repositories:
          reads(server, repositoriesPath) - readsBefore.repositories,
      },
      title: queryByText(failure, palette) !== null,
      groups: groupLabels(),
      highlighted: highlighted()?.getAttribute('href'),
    }).toEqual({
      newReads: { list: 1, repositories: 1 },
      title: false,
      groups: ['Workspaces', 'Actions', 'Settings'],
      highlighted: routes.workspace(org, 'next-16'),
    })
  })
})
