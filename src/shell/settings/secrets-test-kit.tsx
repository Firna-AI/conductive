import type { OrgRole } from '../../shared/api'
import { secretsPath } from '../../shared/secrets'
import { accessibleName } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { secretFixtures } from '../../test-support/fixtures/secrets'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import { OverlayHost } from '../ui/Overlay'
import { SecretsTab } from './SecretsTab'

// The helpers of the tests of the Secrets tab.

export const { secrets, values } = secretFixtures()
export const listPath = secretsPath(FAKE_IDS.org)

/** A secret of the fixtures by its name. */
export function secretNamed(name: string) {
  const found = secrets.find((secret) => secret.name === name)
  if (!found) throw new Error(`The fixtures have no secret ${name}.`)
  return found
}

/**
 * The fake API with the secrets of Acme, for a reader of `role`. Each
 * record of the list also holds its value, as a careless server could send
 * it, so a screen that shows a field of the reply would show the value.
 */
export function secretsServer(role: OrgRole = 'admin'): FakeApiServer {
  const server = new FakeApiServer({ role })
  server.json('GET', listPath, {
    secrets: secrets.map((secret) => ({
      ...secret,
      value: values[secret.id],
    })),
  })
  return server
}

/**
 * The Secrets tab of Acme, mounted for the person of the fake API, with the
 * layer of its dialogs. `copied` gets each text that a copy writes.
 */
export async function mountSecrets(
  server: FakeApiServer,
  copied: string[] = [],
): Promise<HTMLElement> {
  const app = await startedApp(server, {
    copy: async (text) => {
      copied.push(await text)
    },
  })
  const boot = app.boot.get()
  const org = app.orgs.get().find((item) => item.id === FAKE_IDS.org)
  if (boot.state !== 'ready' || !org) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OverlayHost>
      <SecretsTab org={org} user={boot.user} />
    </OverlayHost>,
  )
  await settle()
  return view
}

/** The name, the description, and the record line of each row. */
export function rowsOf(view: HTMLElement): string[][] {
  const rows = view.querySelectorAll('ul[aria-label="Secrets"] > li')
  return Array.from(rows, (row) =>
    Array.from(row.firstElementChild?.children ?? [], (part) =>
      (part.textContent ?? '').trim(),
    ),
  )
}

/** The names of the buttons and the switches of the list, in their order. */
export function controlsOf(view: HTMLElement): string[] {
  const list = view.querySelector('ul[aria-label="Secrets"]')
  return Array.from(
    list?.querySelectorAll('button, [role="switch"]') ?? [],
    accessibleName,
  )
}

/** The JSON bodies of the requests with this method and path. */
export function sentBodies(
  server: FakeApiServer,
  method: string,
  path: string,
): Promise<unknown[]> {
  const sent = server.requests.filter(
    (request) =>
      request.method === method && new URL(request.url).pathname === path,
  )
  return Promise.all(sent.map((request) => request.clone().json()))
}
