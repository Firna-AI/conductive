// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { HeldRequests, requestLines } from '../../app/test-kit'
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
import { automationFixtures } from '../../test-support/fixtures/automations'
import { coreFixtures } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import dialogStyles from '../../ui/components/common/ConfirmDialog.module.css'
import sheetStyles from '../../ui/components/common/Sheet.module.css'
import {
  askRemove,
  moves,
  noRepositories,
  org,
  removals,
  repositories,
  repositoriesTab,
  rows,
  status,
} from './repository-order-test-kit'
import { changed, noticesOf } from './test-builds'
import { click, press, settle } from '../test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

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

  // Only the title names the repository. A phone sheet otherwise cuts its
  // title to one line, and a desktop title otherwise lets a long word run
  // past the dialog, so the question asks for the whole title.
  test.each([
    { viewport: 'desktop', wrapClass: dialogStyles.wrapTitle },
    { viewport: 'phone', wrapClass: sheetStyles.wrapTitle },
  ] as const)(
    'on $viewport, the title of the question shows the whole name, on more lines when it is long',
    async ({ viewport, wrapClass }) => {
      const server = new FakeApiServer()
      const view = await repositoriesTab(server, {}, { viewport })
      const question = await askRemove(view, 'acme/storefront')
      const title = question.querySelector('h2')
      expect({
        text: title?.textContent,
        wraps: title?.classList.contains(wrapClass),
      }).toEqual({ text: 'Remove acme/storefront?', wraps: true })
    },
  )

  test('Remove of the default names the next repository and the automations that turn off, then removes it at once, gives the focus to the next row, says so, and starts no build, so the repository notice offers Build computer', async () => {
    // The spinner of Remove stays on one frame while the answer waits.
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const path = repositoryPath(org, 'storefront')
    // The server takes the removal at once, and its answer waits, so the
    // builds below change between the save and the answer.
    held.holdAnswer('DELETE', path)
    const view = await repositoriesTab(server, { fetch: held.fetch })
    const question = await askRemove(view, 'acme/storefront')
    const text = textOf(question)
    click(byRole('button', 'Remove', question))
    await settle()
    // The server saved the removal. As the Worker does, the builds now name
    // acme/storefront, which the image of the cloud computer still holds.
    // The image stays the same, so the repositories do not read again.
    const { builds } = coreFixtures()
    server.json('GET', orgSettingsPaths.builds(org), {
      ...builds,
      changes: {
        ...builds.changes,
        removedRepositories: [changed('storefront')],
      },
    })
    held.release('DELETE', path)
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
      notices: noticesOf(view),
      buildStarts: requestLines(server).filter(
        (line) => line === `POST ${orgSettingsPaths.builds(org)}`,
      ).length,
    }).toEqual({
      text: [
        'New workspace no longer offers it, and acme/billing-service becomes the default. Its 2 automations turn off, and only their owners can turn them on again.',
      ],
      open: null,
      rows: ['acme/billing-service Default', 'acme/marketing-site'],
      removals: [{ path, body: { build: false } }],
      focus: true,
      status: 'acme/storefront is removed',
      notices: [
        {
          text: 'acme/storefront leaves at the next build Build computer',
          danger: false,
          spinner: false,
          buttons: ['Build computer'],
        },
      ],
      buildStarts: 0,
    })
  })

  test('each opening of the question reads the automations again, and gives no number until that read answers, also after an earlier read found none', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const { list } = automationFixtures(org)
    // The owners of acme/storefront turned its automations off.
    server.json('GET', automationsPath(org), {
      automations: list.automations.map((automation) =>
        automation.repositoryId === 'storefront'
          ? { ...automation, active: false, nextRunAt: null }
          : automation,
      ),
    })
    const view = await repositoriesTab(server, { fetch: held.fetch })
    const first = await askRemove(view, 'acme/storefront')
    const before = textOf(first)
    click(byRole('button', 'Cancel', first))
    await settle()
    // They turn them on again in another tab, and the next read waits.
    server.json('GET', automationsPath(org), list)
    held.hold('GET', automationsPath(org))
    const question = await askRemove(view, 'acme/storefront')
    const waiting = textOf(question)
    held.release('GET', automationsPath(org))
    await settle()
    expect({ before, waiting, answered: textOf(question) }).toEqual({
      before: [
        'New workspace no longer offers it, and acme/billing-service becomes the default.',
      ],
      waiting: [
        'New workspace no longer offers it, and acme/billing-service becomes the default. Each of its automations turns off, and only its owner can turn it on again.',
      ],
      answered: [
        'New workspace no longer offers it, and acme/billing-service becomes the default. Its 2 automations turn off, and only their owners can turn them on again.',
      ],
    })
  })

  test('without the automations, the question gives no number, and nothing closes it while the removal runs, then a failed removal keeps the question and the row, a toast gives the error, and Cancel closes it', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const path = repositoryPath(org, 'marketing-site')
    const failed = {
      error: { code: 'internal', message: 'The server failed.' },
    }
    server.json('GET', automationsPath(org), failed, 500)
    server.json('DELETE', path, failed, 500)
    held.hold('DELETE', path)
    const view = await repositoriesTab(server, { fetch: held.fetch })
    const question = await askRemove(view, 'acme/marketing-site')
    const text = textOf(question)
    click(byRole('button', 'Remove', question))
    await settle()
    const cancel = byRole('button', 'Cancel', question)
    const running = {
      busy: byRole('button', 'Remove', question).getAttribute('aria-busy'),
      cancelOff:
        cancel.hasAttribute('disabled') ||
        cancel.getAttribute('aria-disabled') === 'true',
    }
    press(question, 'Escape')
    await settle()
    const afterEscape =
      queryByRole('dialog', 'Remove acme/marketing-site?') === question
    held.release('DELETE', path)
    await settle()
    expect({
      text,
      running,
      afterEscape,
      open: queryByRole('dialog', 'Remove acme/marketing-site?') === question,
      rows: rows(view),
      toast: byToast("The repository wasn't removed.").textContent,
      removals: (await removals(server)).length,
    }).toEqual({
      text: [
        'New workspace no longer offers it. Each of its automations turns off, and only its owner can turn it on again.',
      ],
      running: { busy: 'true', cancelOff: true },
      afterEscape: true,
      open: true,
      rows: [
        'acme/storefront Default',
        'acme/billing-service',
        'acme/marketing-site',
      ],
      toast: expect.stringContaining('The server failed.'),
      removals: 1,
    })
    click(byRole('button', 'Cancel', question))
    await settle()
    expect(queryByRole('dialog', 'Remove acme/marketing-site?')).toBeNull()
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
