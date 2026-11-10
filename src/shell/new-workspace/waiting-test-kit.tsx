import menuStyles from '../../../docs/mockups/src/components/common/Menu.module.css'
import noticeStyles from '../../../docs/mockups/src/components/common/Notice.module.css'
import { memoryNavigation } from '../../app/navigation'
import { routes } from '../../app/router'
import type { ManualDelay } from '../../app/test-kit'
import type { OrgRole } from '../../shared/api'
import {
  orgSettingsPaths,
  type BuildsResponse,
} from '../../shared/org-settings'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { buildOf, changed, imageBuilds } from '../settings/test-builds'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { NewWorkspaceScreen } from './NewWorkspaceScreen'

// The helpers of the tests of the waiting repositories of New workspace.

const { org } = FAKE_IDS

/** The newest build of each state of a waiting repository. */
export const newest = {
  building: buildOf('add', 'running', 60_000),
  failed: buildOf('add', 'failed', 600_000),
  // No build runs, and the newest build is the good one.
  waiting: null,
} as const

export type Wait = keyof typeof newest

/** The builds of Acme when the org image lacks the repositories `added`. */
export function buildsOf(wait: Wait, added: readonly string[]): BuildsResponse {
  const latest = newest[wait]
  return imageBuilds(latest ? [latest] : [], {
    addedRepositories: added.map(changed),
  })
}

/** The repositories of Acme, with the chosen ones of `ids`. */
export function chosen(ids: readonly string[]) {
  const { repositories } = repositoryFixtures(org).repositories
  return {
    repositories: repositories.map((item) => ({
      ...item,
      selected: ids.includes(item.id),
    })),
  }
}

/** The repositories of the org image of Acme, and acme/admin-dashboard. */
export const withDashboard = chosen([
  'storefront',
  'billing-service',
  'marketing-site',
  'admin-dashboard',
])

/** Whether a button with this name shows, and a press would act. */
function pressable(view: HTMLElement, name: string): boolean {
  const button = queryByRole('button', name, view)
  return (
    button !== null &&
    !button.hasAttribute('disabled') &&
    button.getAttribute('aria-disabled') !== 'true'
  )
}

/**
 * New workspace of Acme, as a person with `role` sees it, with a written
 * draft in the repository `draft`, or in the repository of the form.
 * `delay` holds the timers of the reads.
 */
export async function newWorkspace(options: {
  builds: BuildsResponse
  repositories?: ReturnType<typeof chosen>
  role?: OrgRole
  draft?: string
  delay?: ManualDelay
}) {
  const role = options.role ?? 'admin'
  const server = new FakeApiServer({ role })
  server.json('GET', orgSettingsPaths.builds(org), options.builds)
  if (options.repositories) {
    server.json('GET', orgSettingsPaths.repositories(org), options.repositories)
  }
  const app = await startedApp(
    server,
    options.delay ? { delay: options.delay.delay } : {},
  )
  const draft = app.org(org).newWorkspace(null)
  draft.setText('Add a loading state to the Button component.')
  if (options.draft) draft.setRepository(options.draft)
  const navigation = memoryNavigation(routes.newWorkspace(org))
  const view = mountScreen(
    app,
    <NewWorkspaceScreen
      org={{ id: org, name: 'Acme', role }}
      sectionId={null}
    />,
    { navigation },
  )
  await settle()
  return { server, view, navigation }
}

/** What the page shows: its notices, the picker, Send, and the start note. */
export function shown(view: HTMLElement) {
  const picker = view.querySelector('[aria-label^="Repository: "]')
  return {
    notices: Array.from(
      view.querySelectorAll(`.${noticeStyles.notice}`),
      (notice) => textOf(notice.outerHTML),
    ),
    spinner: view.querySelector(`.${noticeStyles.busy}`) !== null,
    picker: picker?.getAttribute('aria-label') ?? null,
    send: pressable(view, 'Send'),
    note: textOf(view.innerHTML).includes(
      'Starts from the cloud computer of Acme',
    ),
  }
}

/** Opens the repository menu, and gives each row: name, note, off, checked. */
export function menuRows(view: HTMLElement) {
  const picker = view.querySelector<HTMLElement>('[aria-label^="Repository: "]')
  if (!picker) throw new Error('The page has no repository picker.')
  click(picker)
  const menu = byRole('menu', 'Repository', view)
  return Array.from(menu.querySelectorAll('[role^="menuitem"]'), (row) => ({
    name: row.querySelector(`.${menuStyles.label}`)?.textContent,
    note: row.querySelector(`.${menuStyles.detail}`)?.textContent ?? null,
    off: row.hasAttribute('disabled'),
    checked: row.getAttribute('aria-checked') === 'true',
  }))
}
