// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { windowKeys } from '../../app/services'
import { workspacesPath } from '../../shared/workspaces'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import {
  billingQueue,
  withMergeQueue,
} from '../../test-support/fixtures/merge-queue'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { pressHintKey } from '../shortcuts/shortcut-test-kit'
import { mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgList } from './OrgList'
import { layOut, mouse } from './row-drag-test-kit'

const org = FAKE_IDS.org
/** The list of Acme with the two trees of the mockups in Checkout. */
const trees = withSubWorkspaces(workspaceFixtures().workspaces.workspaces)

/** The workspace at an address of the app. */
function workspaceAt(href: string | null): string {
  const found = trees.find((item) => routes.workspace(org, item.id) === href)
  if (!found) throw new Error(`No workspace has the address ${href}.`)
  return found.id
}

/** The workspaces of the rows that a section shows. */
function rowsOf(view: HTMLElement, section: string): string[] {
  const links = view.querySelectorAll(`section[aria-label="${section}"] li a`)
  return Array.from(links, (link) => workspaceAt(link.getAttribute('href')))
}

describe('a collapsed section that holds the open workspace', () => {
  test('shows only the open row, the keys of the list count it, and neither Alt with Up nor a drag moves it', async () => {
    const server = new FakeApiServer({ subWorkspaces: true })
    const app = await startedApp(server, { onKey: windowKeys(window) })
    await app.org(org).reload('list')
    // Infra is collapsed, and it holds the open workspace.
    const navigation = memoryNavigation(routes.workspace(org, 'retry-queue'))
    const view = mountScreen(
      app,
      <OrgList
        offerActions
        orgId={org}
        selectedId="retry-queue"
        variant="sidebar"
        viewer={fakeUser}
      />,
      { navigation },
    )
    await settle()
    const shown = rowsOf(view, 'Infra')
    // The section hides the places of its rows, so Alt with Up and a drag
    // move nothing.
    const row = view.querySelector<HTMLElement>(
      `a[href="${routes.workspace(org, 'retry-queue')}"]`,
    )
    if (!row) throw new Error('Infra shows no row for retry-queue.')
    const sent = server.requests.length
    act(() => row.focus())
    const key = press(row, 'ArrowUp', { alt: true })
    await settle()
    layOut(view, 'Infra', 0, ['retry-queue'], 40)
    mouse(row, 'pointerdown', { clientY: 30 })
    mouse(window, 'pointermove', { clientY: 40 })
    mouse(window, 'pointerup', { clientY: 40, buttons: 0 })
    await settle()
    const moved = {
      prevented: key.defaultPrevented,
      requests: server.requests.length - sent,
    }
    pressHintKey(app, 'previous-workspace', document.body)
    expect({ shown, moved, previous: workspaceAt(navigation.href()) }).toEqual({
      shown: ['retry-queue'],
      moved: { prevented: true, requests: 0 },
      previous: 'suggestion-list',
    })
  })

  test('shows an open queued workspace only in the merge queue', async () => {
    const server = new FakeApiServer({ subWorkspaces: true })
    server.json('GET', workspacesPath(org), {
      ...workspaceFixtures().workspaces,
      workspaces: withMergeQueue(trees, billingQueue),
    })
    const app = await startedApp(server)
    await app.org(org).reload('list')
    const view = mountScreen(
      app,
      <OrgList
        orgId={org}
        selectedId="retry-queue"
        variant="sidebar"
        viewer={fakeUser}
      />,
      { navigation: memoryNavigation(routes.workspace(org, 'retry-queue')) },
    )
    await settle()
    expect(rowsOf(view, 'Merge queue')).toEqual([
      'webhook-retries',
      'retry-queue',
    ])
    expect(rowsOf(view, 'Infra')).toEqual([])
    const href = routes.workspace(org, 'retry-queue')
    const copies = view.querySelectorAll(`a[href="${href}"]`)
    expect(
      [...copies].map((link) => link.getAttribute('aria-current')),
    ).toEqual(['page'])
  })
})
