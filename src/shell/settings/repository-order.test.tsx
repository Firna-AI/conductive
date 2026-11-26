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
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import {
  answer,
  moves,
  org,
  repositories,
  repositoriesTab,
  rows,
  status,
} from './repository-order-test-kit'
import { click, press, settle } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

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
  test('an admin sees Default on the first row, the row menu ends with Remove, and Make default moves a repository to the top at once and says so', async () => {
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
        { name: 'Remove', off: false },
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
})
