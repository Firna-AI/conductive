// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import { requestLines } from '../../app/test-kit'
import { workspacesPath } from '../../shared/workspaces'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, settle } from '../test-mount'
import {
  groupLabels,
  openPaletteTab,
  options,
  pressPaletteKey,
} from './palette-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const listPath = workspacesPath(org)
const failure = "The workspaces didn't load"

/** The reads of the workspace list of Acme that the fake API got. */
function listReads(server: FakeApiServer): number {
  return requestLines(server).filter((line) => line === `GET ${listPath}`)
    .length
}

describe('the Workspaces tab of the palette', () => {
  test('a list that did not load shows the failure with Try again, which reads the list again and shows its workspaces', async () => {
    const server = new FakeApiServer()
    // The first read fails, before any read of the list succeeds.
    server.json(
      'GET',
      listPath,
      { error: { code: 'unavailable', message: 'The service is busy.' } },
      503,
    )
    await openPaletteTab(routes.org(org), { server })
    pressPaletteKey('other', document.body)
    click(byRole('tab', 'Workspaces'))
    const palette = byRole('dialog', 'Search')
    expect({
      title: queryByText(failure, palette) !== null,
      retry: queryByRole('button', 'Try again', palette) !== null,
    }).toEqual({ title: true, retry: true })
    const readsBefore = listReads(server)
    server.json('GET', listPath, workspaceFixtures().workspaces)
    click(byRole('button', 'Try again', palette))
    await settle()
    expect({
      newListReads: listReads(server) - readsBefore,
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
