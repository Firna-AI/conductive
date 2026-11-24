// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import { windowKeys } from '../../app/services'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import { withSubWorkspaces } from '../../test-support/fixtures/sub-workspaces'
import { workspaceFixtures } from '../../test-support/fixtures/workspaces'
import { pressHintKey } from '../shortcuts/shortcut-test-kit'
import { mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgList } from './OrgList'

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
  test('shows only the open row, the keys of the list count it, and Alt with Up does not move it', async () => {
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
    // The section hides the places of its rows, so Alt with Up moves
    // nothing.
    const row = view.querySelector<HTMLElement>(
      `a[href="${routes.workspace(org, 'retry-queue')}"]`,
    )
    if (!row) throw new Error('Infra shows no row for retry-queue.')
    const sent = server.requests.length
    act(() => row.focus())
    const key = press(row, 'ArrowUp', { alt: true })
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
})
