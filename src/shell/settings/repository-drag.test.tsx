// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { repositoryPositionPath } from '../../shared/org-settings'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { mouse } from '../layout/rail-test-kit'
import { click, settle } from '../test-mount'
import {
  answer,
  moves,
  org,
  repositoriesTab,
  rows,
  status,
} from './repository-order-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the pointer moves of the repository order', () => {
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

  test('a press on a menu item that moves the pointer starts no drag, and the item still runs', async () => {
    const server = new FakeApiServer()
    server.json(
      'PUT',
      repositoryPositionPath(org, 'billing-service'),
      answer('billing-service', 0),
    )
    const view = await repositoriesTab(server)
    click(byRole('button', 'More for acme/billing-service', view))
    const item = byRole('menuitem', 'Move up')
    mouse(item, 'pointerdown', { clientY: 60 })
    mouse(window, 'pointermove', { clientY: 60, clientX: 40 })
    const during = status(view)
    mouse(window, 'pointerup', { clientY: 60, clientX: 40, buttons: 0 })
    click(item)
    await settle()
    expect({
      during,
      after: rows(view),
      moves: await moves(server),
    }).toEqual({
      during: '',
      after: [
        'acme/billing-service Default',
        'acme/storefront',
        'acme/marketing-site',
      ],
      moves: [
        {
          path: repositoryPositionPath(org, 'billing-service'),
          body: { index: 0 },
        },
      ],
    })
  })
})
