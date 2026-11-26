import { repositoryMoved } from '../../app/settings-actions'
import { byRole, byText, queryByRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { click, mountScreen, settle } from '../test-mount'
import { startedApp, type ScreenOptions } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { OrgSettingsScreen } from './OrgSettingsScreen'

export const { org } = FAKE_IDS
export const { repositories } = repositoryFixtures(org).repositories

/**
 * The Repositories tab of Acme, mounted for the role of the server, in the
 * layer where its dialogs open. The overrides are those of `startedApp`,
 * such as the fetch of `HeldRequests`, and `screen` gives the options of
 * the mount, such as the phone viewport.
 */
export async function repositoriesTab(
  server: FakeApiServer,
  overrides: Parameters<typeof startedApp>[1] = {},
  screen: ScreenOptions = {},
) {
  const app = await startedApp(server, overrides)
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OverlayHost>
      <OrgSettingsScreen org={acme} tab="repositories" user={boot.user} />
    </OverlayHost>,
    screen,
  )
  await settle()
  return view
}

/**
 * Selects Remove in the row menu of the repository `name`, beside its
 * button on desktop or in a sheet on a phone. The result is the question.
 */
export async function askRemove(
  view: HTMLElement,
  name: string,
): Promise<HTMLElement> {
  click(byRole('button', `More for ${name}`, view))
  click(byRole('menuitem', 'Remove'))
  await settle()
  return byRole('dialog', `Remove ${name}?`)
}

/** Each row of the list: its name, and Default when it shows. */
export function rows(view: HTMLElement): string[] {
  const list = byRole('list', 'Repositories', view)
  return Array.from(list.querySelectorAll('li')).map((row) => {
    const name = row.querySelector('span span')?.textContent ?? ''
    return row.textContent?.includes('Default') ? `${name} Default` : name
  })
}

/** The line in place of the list while no repository is chosen. */
export const noRepositories = 'Select Edit to add a repository.'

/**
 * The status that a screen reader hears after a move or a removal. It
 * stays when no row is left, beside the line in place of the list.
 */
export function status(view: HTMLElement): string {
  const place =
    queryByRole('list', 'Repositories', view) ?? byText(noRepositories, view)
  return (
    place.parentElement?.querySelector('[role="status"]')?.textContent ?? ''
  )
}

/** The removals that the app sent, with their paths and their bodies. */
export async function removals(server: FakeApiServer) {
  const sent = server.requests.filter((request) => request.method === 'DELETE')
  return Promise.all(
    sent.map(async (request) => ({
      path: new URL(request.url).pathname,
      body: (await request.clone().json()) as unknown,
    })),
  )
}

/** The bodies of the moves that the app sent, with their paths. */
export async function moves(server: FakeApiServer) {
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
export function answer(repositoryId: string, index: number) {
  return {
    order: repositoryMoved(repositories, repositoryId, index)
      .filter((item) => item.selected)
      .map((item) => item.id),
  }
}
