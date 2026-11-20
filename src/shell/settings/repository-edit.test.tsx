// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  compareRepositoryNames,
  repositoryPath,
} from '../../shared/org-settings'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The Repositories tab of Acme, mounted for an admin. */
async function repositoriesTab(server: FakeApiServer) {
  const app = await startedApp(server)
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OrgSettingsScreen org={acme} tab="repositories" user={boot.user} />,
  )
  await settle()
  return view
}

/** The full names of the rows that the list shows. */
function rowNames(view: HTMLElement): string[] {
  const list = byRole('list', 'Repositories', view)
  return Array.from(list.querySelectorAll('li')).map(
    (row) => row.querySelector('span span')?.textContent ?? '',
  )
}

describe('the Repositories tab of an admin', () => {
  test('lists only the chosen repositories, and Edit opens every repository by name with Add and Remove until Done', async () => {
    const server = new FakeApiServer()
    const view = await repositoriesTab(server)
    const { repositories } = repositoryFixtures(org).repositories
    const chosen = repositories
      .filter((item) => item.selected)
      .map((item) => item.fullName)
    const before = {
      rows: rowNames(view),
      search: queryByRole('textbox', 'Search repositories', view) !== null,
    }
    click(byRole('button', 'Edit', view))
    await settle()
    const editing = {
      rows: rowNames(view),
      search: queryByRole('textbox', 'Search repositories', view) !== null,
    }
    server.json('PUT', repositoryPath(org, 'admin-dashboard'), {
      repositories: repositories.map((item) =>
        item.id === 'admin-dashboard' ? { ...item, selected: true } : item,
      ),
    })
    click(byRole('button', 'Add acme/admin-dashboard', view))
    await settle()
    click(byRole('button', 'Done', view))
    await settle()
    expect({ before, editing, after: rowNames(view) }).toEqual({
      before: { rows: chosen, search: false },
      editing: {
        rows: [...repositories]
          .sort(compareRepositoryNames)
          .map((item) => item.fullName),
        search: true,
      },
      after: repositories
        .filter((item) => item.selected || item.id === 'admin-dashboard')
        .map((item) => item.fullName),
    })
    expect(queryByRole('button', 'Edit', view)).not.toBeNull()
  })
})
