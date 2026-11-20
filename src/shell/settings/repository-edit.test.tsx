// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import {
  compareRepositoryNames,
  orgSettingsPaths,
  repositoryPath,
  type Repository,
} from '../../shared/org-settings'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgTabContent } from './OrgTabContent'
import { noticesOf } from './test-builds'

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
    <OrgTabContent org={acme} tab="repositories" user={boot.user} />,
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

/** The writes that the tab sent, in order, with their JSON bodies. */
async function writes(server: FakeApiServer) {
  return Promise.all(
    server.requests
      .filter((request) => request.method !== 'GET')
      .map(async (request) => ({
        method: request.method,
        path: new URL(request.url).pathname,
        body: (await request.clone().text()) || null,
      })),
  )
}

/** Answers each add and removal of `ids` with the list after it. */
function answerChanges(server: FakeApiServer, ids: readonly string[]) {
  const { repositories } = repositoryFixtures(org).repositories
  const after = (id: string, selected: boolean): Repository[] =>
    repositories.map((item) => (item.id === id ? { ...item, selected } : item))
  for (const id of ids) {
    server.json('PUT', repositoryPath(org, id), {
      repositories: after(id, true),
    })
    server.json('DELETE', repositoryPath(org, id), {
      repositories: after(id, false),
    })
  }
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

  test('Add and Remove save nothing until Done, which saves the removals first and then starts one build', async () => {
    const server = new FakeApiServer()
    answerChanges(server, ['admin-dashboard', 'mobile-app', 'storefront'])
    const view = await repositoriesTab(server)
    click(byRole('button', 'Edit', view))
    await settle()
    click(byRole('button', 'Add acme/admin-dashboard', view))
    click(byRole('button', 'Add acme/mobile-app', view))
    click(byRole('button', 'Remove acme/storefront', view))
    await settle()
    const beforeDone = await writes(server)
    click(byRole('button', 'Done', view))
    await settle()
    const deferred = JSON.stringify({ build: false })
    expect({ beforeDone, afterDone: await writes(server) }).toEqual({
      beforeDone: [],
      afterDone: [
        {
          method: 'DELETE',
          path: repositoryPath(org, 'storefront'),
          body: deferred,
        },
        {
          method: 'PUT',
          path: repositoryPath(org, 'admin-dashboard'),
          body: deferred,
        },
        {
          method: 'PUT',
          path: repositoryPath(org, 'mobile-app'),
          body: deferred,
        },
        { method: 'POST', path: orgSettingsPaths.builds(org), body: '{}' },
      ],
    })
    expect(queryByRole('button', 'Edit', view)).not.toBeNull()
  })

  test('Done keeps the edit open while it saves, so no second edit starts before its build', async () => {
    // The spinner of Done would otherwise ask for frames without end.
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { repositories } = repositoryFixtures(org).repositories
    let release: () => void = () => undefined
    server.json(
      'PUT',
      repositoryPath(org, 'admin-dashboard'),
      new Promise((resolve) => {
        release = () =>
          resolve({
            repositories: repositories.map((item) =>
              item.id === 'admin-dashboard'
                ? { ...item, selected: true }
                : item,
            ),
          })
      }),
    )
    const view = await repositoriesTab(server)
    click(byRole('button', 'Edit', view))
    await settle()
    click(byRole('button', 'Add acme/admin-dashboard', view))
    await settle()
    click(byRole('button', 'Done', view))
    await settle()
    const whileSaving = {
      writes: (await writes(server)).map((write) => write.method),
      edit: queryByRole('button', 'Edit', view) !== null,
    }
    release()
    await settle()
    expect({
      whileSaving,
      afterSave: {
        writes: (await writes(server)).map((write) => write.method),
        edit: queryByRole('button', 'Edit', view) !== null,
      },
    }).toEqual({
      whileSaving: { writes: ['PUT'], edit: false },
      afterSave: { writes: ['PUT', 'POST'], edit: true },
    })
  })

  test('a change that does not save keeps the edit open with that change, and starts no build', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      repositoryPath(org, 'admin-dashboard'),
      { error: { code: 'repository_not_found', message: 'Not available.' } },
      404,
    )
    const view = await repositoriesTab(server)
    click(byRole('button', 'Edit', view))
    await settle()
    click(byRole('button', 'Add acme/admin-dashboard', view))
    await settle()
    click(byRole('button', 'Done', view))
    await settle()
    expect({
      writes: (await writes(server)).map((write) => write.method),
      done: queryByRole('button', 'Done', view) !== null,
      kept: queryByRole('button', 'Remove acme/admin-dashboard', view) !== null,
    }).toEqual({ writes: ['PUT'], done: true, kept: true })
  })

  test('a change that does not save leaves the other changes to save, and their add starts one build', async () => {
    const server = new FakeApiServer()
    answerChanges(server, ['mobile-app'])
    server.json(
      'PUT',
      repositoryPath(org, 'admin-dashboard'),
      { error: { code: 'repository_not_found', message: 'Not available.' } },
      404,
    )
    const view = await repositoriesTab(server)
    click(byRole('button', 'Edit', view))
    await settle()
    click(byRole('button', 'Add acme/admin-dashboard', view))
    click(byRole('button', 'Add acme/mobile-app', view))
    await settle()
    click(byRole('button', 'Done', view))
    await settle()
    expect({
      writes: (await writes(server)).map(
        (write) => `${write.method} ${write.path}`,
      ),
      done: queryByRole('button', 'Done', view) !== null,
      kept: queryByRole('button', 'Remove acme/admin-dashboard', view) !== null,
      notices: noticesOf(view).map((notice) => notice.text),
    }).toEqual({
      notices: ['Select Done to add acme/admin-dashboard and start a build'],
      writes: [
        `PUT ${repositoryPath(org, 'admin-dashboard')}`,
        `PUT ${repositoryPath(org, 'mobile-app')}`,
        `POST ${orgSettingsPaths.builds(org)}`,
      ],
      done: true,
      kept: true,
    })
  })

  test('Done saves nothing and starts no build when the edit removed each repository that it added', async () => {
    const server = new FakeApiServer()
    const view = await repositoriesTab(server)
    click(byRole('button', 'Edit', view))
    await settle()
    click(byRole('button', 'Add acme/admin-dashboard', view))
    await settle()
    click(byRole('button', 'Remove acme/admin-dashboard', view))
    await settle()
    click(byRole('button', 'Done', view))
    await settle()
    expect(await writes(server)).toEqual([])
  })
})
