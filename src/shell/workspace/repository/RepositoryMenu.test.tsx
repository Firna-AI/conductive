// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { nameLabel } from '../../../shared/name-label'
import { orgSettingsPaths } from '../../../shared/org-settings'
import { workspaceViewPath } from '../../../shared/workspace-view'
import { queryByRole } from '../../../test-support/dom-queries'
import { FakeApiServer } from '../../../test-support/fake-api'
import {
  changedReply,
  MOVED_BRANCH,
  movedWorkspace,
  repositoryChangedEvents,
  serveHeld,
  serveRepositoryChange,
} from '../../../test-support/fake-repository-change'
import { fakeUser } from '../../../test-support/fixtures/core'
import { repositoryFixtures } from '../../../test-support/fixtures/repositories'
import { FAKE_FILE_PATH } from '../../../test-support/fixtures/tools'
import {
  senderSnapshot,
  workspaceFixtures,
} from '../../../test-support/fixtures/workspaces'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../../test-support/mount'
import { serveSuspendedAcme } from '../../../test-support/suspended-org'
import { settle } from '../../test-mount'
import { filesHref } from '../files/files-address'
import { answer, bodiesOf, emit, here, lastEvent } from '../kept-test-kit'
import {
  changeBodies,
  id,
  menuRow,
  menuRows,
  openWorkspace,
  org,
} from './repository-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const current = 'Repository: acme/storefront'
const note = `You moved the workspace to acme/billing-service, on the new branch ${MOVED_BRANCH}`

/** Publishes the change as the Worker does, after the poll that ends it. */
function publish(server: FakeApiServer) {
  const { detail, sessions } = workspaceFixtures()
  const events = repositoryChangedEvents(
    detail.workspace,
    [...sessions.sessions, ...sessions.history],
    senderSnapshot(fakeUser),
  )
  changedReply(
    server,
    movedWorkspace(detail.workspace),
    lastEvent(server) + events.length,
  )
  return () => {
    for (const event of events) emit(server, event)
  }
}

describe('the repository menu in the header', () => {
  test('lists each chosen repository, also a waiting one that the cloud computer does not hold, and a pick of that one moves the workspace with progress and a note', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    // acme/billing-service waits for the next build of the org image, and the
    // cloud computer lacks it. The cloud computer holds acme/admin-dashboard,
    // which the org no longer chooses.
    const { repositories } = repositoryFixtures(org).repositories
    server.json('GET', orgSettingsPaths.repositories(org), {
      repositories: repositories.map((item) => ({
        ...item,
        ready: item.id !== 'billing-service',
      })),
    })
    serveHeld(server, ['storefront', 'marketing-site', 'admin-dashboard'])
    serveRepositoryChange(server, 'changed')
    const tab = await openWorkspace(server)

    await press(await tab.button(current))
    expect(menuRows()).toEqual([
      { name: 'acme/storefront', checked: true },
      { name: 'acme/billing-service', checked: false },
      { name: 'acme/marketing-site', checked: false },
    ])
    await press(menuRow('acme/storefront'))
    const afterCurrent = (await changeBodies(server)).length
    await press(await tab.button(current))
    await press(menuRow('acme/billing-service'))
    const progress = await tab.button(
      'Changing repository: acme/billing-service',
    )
    const showEvents = publish(server)
    await tab.poll()
    showEvents()
    await settle()

    expect({
      afterCurrent,
      progress: progress.textContent,
      bodies: await changeBodies(server),
      header: (await tab.button('Repository: acme/billing-service'))
        .textContent,
      note: (tab.view.textContent ?? '').includes(note),
    }).toEqual({
      afterCurrent: 0,
      progress: 'acme/billing-service',
      bodies: [
        {
          expectedRepositoryId: 'storefront',
          expectedBranch: workspaceFixtures().detail.workspace.branch,
          repositoryId: 'billing-service',
        },
      ],
      header: 'acme/billing-service',
      note: true,
    })
  })

  test('closes the file tab of the old repository, and its page goes back to the chat', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const { view } = workspaceFixtures()
    const file = { kind: 'file', path: FAKE_FILE_PATH, mode: 'source' } as const
    server.json('GET', workspaceViewPath(org, id), {
      ...view,
      view: {
        ...view.view,
        tabs: [...view.view.tabs, file],
        activeTab: file,
      },
      heldRepositoryIds: ['storefront', 'billing-service'],
    })
    serveRepositoryChange(server, 'changed')
    const tab = await openWorkspace(server, { href: filesHref(org, id, file) })
    const saves = server.requests.length

    await press(await tab.button(current))
    await press(menuRow('acme/billing-service'))
    const showEvents = publish(server)
    await tab.poll()
    showEvents()
    await settle()
    const saved = await bodiesOf(
      server,
      'PUT',
      workspaceViewPath(org, id),
      saves,
    )

    expect({
      address: tab.navigation.href(),
      saved: saved.at(-1),
    }).toEqual({
      address: here,
      saved: {
        ...view.view,
        activeTab: view.view.activeTab,
        temporaryTab: null,
        previewTabs: [],
        activePreview: null,
      },
    })
  })

  test('opens as a sheet from the line under the name on a phone', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    serveHeld(server, ['storefront', 'billing-service', 'marketing-site'])
    const tab = await openWorkspace(server, { viewport: 'phone' })

    await press(await tab.button(current))
    const sheet = await waitFor(
      () =>
        queryByRole(
          'dialog',
          nameLabel(workspaceFixtures().detail.workspace.name),
        ),
      'the sheet of the repository menu',
    )

    expect({
      inSheet: sheet.querySelectorAll('[role="menuitemradio"]').length,
      rows: menuRows(),
    }).toEqual({
      inSheet: 3,
      rows: [
        { name: 'acme/storefront', checked: true },
        { name: 'acme/billing-service', checked: false },
        { name: 'acme/marketing-site', checked: false },
      ],
    })
  })

  test.each([
    ['a workspace without a record of its folders', 'none'],
    ['an archived workspace', 'archived'],
    ['a suspended org', 'suspended'],
  ] as const)('shows the repository as text in %s', async (_, state) => {
    holdAnimationFrames()
    const server = new FakeApiServer(
      state === 'archived' ? { workspaceState: 'archived' } : {},
    )
    if (state === 'suspended') serveSuspendedAcme(server)
    serveHeld(
      server,
      state === 'none' ? null : ['storefront', 'billing-service'],
    )
    const tab = await openWorkspace(server)
    // The chat shows its history after it read the view.
    await waitFor(
      () => ((tab.view.textContent ?? '').includes(answer) ? true : null),
      'the history of the chat',
    )

    expect({
      button: queryByRole('button', current, tab.header()),
      text: tab.header().textContent?.includes('acme/storefront'),
    }).toEqual({ button: null, text: true })
  })
})
