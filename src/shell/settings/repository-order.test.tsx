// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { repositoryMoved } from '../../app/settings-actions'
import {
  repositoryPositionPath,
  type Repository,
} from '../../shared/org-settings'
import {
  accessibleName,
  byRole,
  queryByRole,
  shownToasts,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mouse } from '../layout/rail-test-kit'
import { click, mountScreen, press, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS
const { repositories } = repositoryFixtures(org).repositories

/** The Repositories tab of Acme, mounted for the role of the server. */
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

/** Each row of the list: its name, and Default when it shows. */
function rows(view: HTMLElement): string[] {
  const list = byRole('list', 'Repositories', view)
  return Array.from(list.querySelectorAll('li')).map((row) => {
    const name = row.querySelector('span span')?.textContent ?? ''
    return row.textContent?.includes('Default') ? `${name} Default` : name
  })
}

/** The status that a screen reader hears after a move. */
function status(view: HTMLElement): string {
  const list = byRole('list', 'Repositories', view)
  return list.parentElement?.querySelector('[role="status"]')?.textContent ?? ''
}

/** The bodies of the moves that the app sent, with their paths. */
async function moves(server: FakeApiServer) {
  const sent = server.requests.filter((request) =>
    request.url.endsWith('/position'),
  )
  return Promise.all(
    sent.map(async (request) => ({
      path: new URL(request.url).pathname,
      body: (await request.json()) as unknown,
    })),
  )
}

/** The saved order that the server answers after a move to `index`. */
function answer(repositoryId: string, index: number) {
  return {
    order: repositoryMoved(repositories, repositoryId, index)
      .filter((item) => item.selected)
      .map((item) => item.id),
  }
}

describe('repositoryMoved', () => {
  const list: Repository[] = repositories.map((item) => ({ ...item }))
  const names = (value: readonly Repository[]) => value.map((item) => item.id)

  test('moves a chosen repository among the chosen ones, keeps the others after them, and moves nothing that is not chosen', () => {
    expect({
      top: names(repositoryMoved(list, 'marketing-site', 0)),
      clamped: names(repositoryMoved(list, 'storefront', 9)),
      unchosen: names(repositoryMoved(list, 'mobile-app', 0)),
    }).toEqual({
      top: [
        'marketing-site',
        'storefront',
        'billing-service',
        'admin-dashboard',
        'mobile-app',
        'data-pipeline',
      ],
      clamped: [
        'billing-service',
        'marketing-site',
        'storefront',
        'admin-dashboard',
        'mobile-app',
        'data-pipeline',
      ],
      unchosen: names(list),
    })
  })
})

describe('the repository order of the Repositories tab', () => {
  test('an admin sees Default on the first row, and Make default moves a repository to the top at once and says so', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      repositoryPositionPath(org, 'billing-service'),
      answer('billing-service', 0),
    )
    const view = await repositoriesTab(server)
    const before = rows(view)
    click(byRole('button', 'More for acme/billing-service', view))
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    ).map((item) => ({
      name: accessibleName(item),
      off: item.getAttribute('aria-disabled') === 'true',
    }))
    click(byRole('menuitem', 'Make default'))
    await settle()
    expect({
      before,
      items,
      after: rows(view),
      status: status(view),
      moves: await moves(server),
    }).toEqual({
      before: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      items: [
        { name: 'Make default', off: false },
        { name: 'Move up', off: false },
        { name: 'Move down', off: false },
      ],
      after: [
        'acme/billing-service Default',
        'acme/storefront',
        'acme/marketing-site',
      ],
      status: 'acme/billing-service moves to place 1 of 3',
      moves: [
        {
          path: repositoryPositionPath(org, 'billing-service'),
          body: { index: 0 },
        },
      ],
    })
  })

  test('Alt and Down move a focused row one place, and a failed save takes the move back with a toast', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      repositoryPositionPath(org, 'storefront'),
      { error: { code: 'internal', message: 'The server failed.' } },
      500,
    )
    const view = await repositoriesTab(server)
    const more = byRole('button', 'More for acme/storefront', view)
    act(() => more.focus())
    const key = press(more, 'ArrowDown', { alt: true })
    const shown = rows(view)
    await settle()
    expect({
      stopped: key.defaultPrevented,
      shown,
      after: rows(view),
      toasts: shownToasts().map((toast) => toast.textContent),
      moves: await moves(server),
    }).toEqual({
      stopped: true,
      shown: [
        'acme/billing-service Default',
        'acme/storefront',
        'acme/marketing-site',
      ],
      after: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      toasts: [expect.stringContaining("The repository didn't move.")],
      moves: [
        {
          path: repositoryPositionPath(org, 'storefront'),
          body: { index: 1 },
        },
      ],
    })
  })

  test('a member sees the order with Default and no moves', async () => {
    const server = new FakeApiServer({ role: 'member' })
    const view = await repositoriesTab(server)
    expect({
      rows: rows(view),
      more: queryByRole('button', 'More for acme/storefront', view),
    }).toEqual({
      rows: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      more: null,
    })
  })

  test('a drag of a row by the mouse moves it, says its place during the drag, and says its new place after the drop', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      repositoryPositionPath(org, 'marketing-site'),
      answer('marketing-site', 0),
    )
    const view = await repositoriesTab(server)
    const list = byRole('list', 'Repositories', view)
    const items = Array.from(list.querySelectorAll('li'))
    items.forEach((item, index) => {
      const box = new DOMRect(0, index * 44, 600, 44)
      Object.defineProperty(item, 'getBoundingClientRect', {
        configurable: true,
        value: () => box,
      })
    })
    const last = items[2]
    mouse(last, 'pointerdown', { clientY: 110 })
    mouse(window, 'pointermove', { clientY: 100 })
    mouse(window, 'pointermove', { clientY: 5 })
    const during = status(view)
    mouse(window, 'pointerup', { clientY: 5, buttons: 0 })
    await settle()
    expect({
      during,
      after: rows(view),
      status: status(view),
      moves: await moves(server),
    }).toEqual({
      during: 'Moving acme/marketing-site to place 1 of 3',
      after: [
        'acme/marketing-site Default',
        'acme/storefront',
        'acme/billing-service',
      ],
      status: 'acme/marketing-site moves to place 1 of 3',
      moves: [
        {
          path: repositoryPositionPath(org, 'marketing-site'),
          body: { index: 0 },
        },
      ],
    })
  })
})
