import { repositoryMoved } from '../../app/settings-actions'
import { byRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { repositoryFixtures } from '../../test-support/fixtures/repositories'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgTabContent } from './OrgTabContent'

export const { org } = FAKE_IDS
export const { repositories } = repositoryFixtures(org).repositories

/** The Repositories tab of Acme, mounted for the role of the server. */
export async function repositoriesTab(server: FakeApiServer) {
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

/** Each row of the list: its name, and Default when it shows. */
export function rows(view: HTMLElement): string[] {
  const list = byRole('list', 'Repositories', view)
  return Array.from(list.querySelectorAll('li')).map((row) => {
    const name = row.querySelector('span span')?.textContent ?? ''
    return row.textContent?.includes('Default') ? `${name} Default` : name
  })
}

/** The status that a screen reader hears after a move. */
export function status(view: HTMLElement): string {
  const list = byRole('list', 'Repositories', view)
  return list.parentElement?.querySelector('[role="status"]')?.textContent ?? ''
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
