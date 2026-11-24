// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { automationsPath } from '../../shared/automations'
import {
  orgSettingsPaths,
  repositoryPath,
  type Repository,
} from '../../shared/org-settings'
import {
  byRole,
  byToast,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import {
  moves,
  noRepositories,
  org,
  removals,
  repositories,
  repositoriesTab,
  rows,
  status,
} from './repository-order-test-kit'
import { click, press, settle } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** Selects Remove in the row menu of the repository `name`: the question. */
async function askRemove(
  view: HTMLElement,
  name: string,
): Promise<HTMLElement> {
  click(byRole('button', `More for ${name}`, view))
  click(byRole('menuitem', 'Remove'))
  await settle()
  return byRole('dialog', `Remove ${name}?`)
}

/** The paragraphs of a question. */
function textOf(question: HTMLElement): string[] {
  return Array.from(question.querySelectorAll('p'), (line) =>
    (line.textContent ?? '').trim(),
  )
}

describe('Remove in the row menu of the Repositories tab', () => {
  test('Remove asks first, Alt and Down in the question move no row, and Cancel sends nothing and gives the focus back to the row menu', async () => {
    const server = new FakeApiServer()
    const view = await repositoriesTab(server)
    const question = await askRemove(view, 'acme/billing-service')
    const text = textOf(question)
    press(byRole('button', 'Cancel', question), 'ArrowDown', { alt: true })
    click(byRole('button', 'Cancel', question))
    await settle()
    expect({
      text,
      open: queryByRole('dialog', 'Remove acme/billing-service?'),
      rows: rows(view),
      removals: await removals(server),
      moves: await moves(server),
      focus:
        document.activeElement ===
        byRole('button', 'More for acme/billing-service', view),
    }).toEqual({
      text: ['New workspace no longer offers it.'],
      open: null,
      rows: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      removals: [],
      moves: [],
      focus: true,
    })
  })

  test('Remove of the default names the next repository and the automations that turn off, then removes it at once, gives the focus to the next row, and says so', async () => {
    const server = new FakeApiServer()
    const view = await repositoriesTab(server)
    const question = await askRemove(view, 'acme/storefront')
    const text = textOf(question)
    click(byRole('button', 'Remove', question))
    await settle()
    expect({
      text,
      open: queryByRole('dialog', 'Remove acme/storefront?'),
      rows: rows(view),
      removals: await removals(server),
      focus:
        document.activeElement ===
        byRole('button', 'More for acme/billing-service', view),
      status: status(view),
    }).toEqual({
      text: [
        'New workspace no longer offers it, and acme/billing-service becomes the default. Its 2 automations turn off, and only their owners can turn them on again.',
      ],
      open: null,
      rows: ['acme/billing-service Default', 'acme/marketing-site'],
      removals: [
        { path: repositoryPath(org, 'storefront'), body: { build: false } },
      ],
      focus: true,
      status: 'acme/storefront is removed',
    })
  })

  test('without the automations, the question gives no number, and a failed removal keeps the question and the row, and a toast gives the error', async () => {
    const server = new FakeApiServer()
    const failed = {
      error: { code: 'internal', message: 'The server failed.' },
    }
    server.json('GET', automationsPath(org), failed, 500)
    server.json('DELETE', repositoryPath(org, 'marketing-site'), failed, 500)
    const view = await repositoriesTab(server)
    const question = await askRemove(view, 'acme/marketing-site')
    const text = textOf(question)
    click(byRole('button', 'Remove', question))
    await settle()
    expect({
      text,
      open: queryByRole('dialog', 'Remove acme/marketing-site?') === question,
      rows: rows(view),
      toast: byToast("The repository wasn't removed.").textContent,
      removals: (await removals(server)).length,
    }).toEqual({
      text: [
        'New workspace no longer offers it. Each of its automations turns off, and only its owner can turn it on again.',
      ],
      open: true,
      rows: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      toast: expect.stringContaining('The server failed.'),
      removals: 1,
    })
  })

  test('Remove of the only repository says that no new workspace can start, and Edit then takes the focus', async () => {
    const server = new FakeApiServer()
    const chosen = (selected: (item: Repository) => boolean) => ({
      repositories: repositories.map((item) => ({
        ...item,
        selected: selected(item),
      })),
    })
    server.json(
      'GET',
      orgSettingsPaths.repositories(org),
      chosen((item) => item.id === 'storefront'),
    )
    server.json(
      'DELETE',
      repositoryPath(org, 'storefront'),
      chosen(() => false),
    )
    const view = await repositoriesTab(server)
    const question = await askRemove(view, 'acme/storefront')
    const text = textOf(question)
    click(byRole('button', 'Remove', question))
    await settle()
    expect({
      text,
      list: queryByRole('list', 'Repositories', view),
      empty: queryByText(noRepositories, view) !== null,
      focus: document.activeElement === byRole('button', 'Edit', view),
      status: status(view),
    }).toEqual({
      text: [
        'New workspace no longer offers it, and no new workspace can start until you add a repository. Its 2 automations turn off, and only their owners can turn them on again.',
      ],
      list: null,
      empty: true,
      focus: true,
      status: 'acme/storefront is removed',
    })
  })
})
