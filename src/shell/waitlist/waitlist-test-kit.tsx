import { AppModel } from '../../app/app-model'
import { getStartedOrder } from '../../app/get-started'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { testServices } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { API_PATHS } from '../../shared/api'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import type { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures } from '../../test-support/fixtures/core'
import { waitingUser } from '../../test-support/fixtures/waitlist'
import { textOf } from '../test-render'
import { mountScreen } from '../test-mount'
import { Shell } from '../Shell'

/**
 * The whole app at `href`, over the fake API, as a person opens it. The
 * shell starts the app. The overrides are those of `testServices`.
 */
export function openApp(
  server: FakeApiServer,
  href: string,
  overrides: Parameters<typeof testServices>[1] = {},
) {
  const app = new AppModel(testServices(server, overrides))
  const navigation = memoryNavigation(href)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  return { app, navigation, view }
}

/**
 * Serves the account of Sam after app access arrived: a new account, with
 * no org, no agent login, and no step of Get started done.
 */
export function serveNewAccount(server: FakeApiServer): void {
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    user: waitingUser,
    agentLogins: [
      { agent: 'claude', connected: false },
      { agent: 'codex', connected: false },
    ],
  })
  server.json('GET', API_PATHS.orgs, { orgs: [] })
  server.json('GET', GET_STARTED_PATH, {
    orgId: null,
    steps: getStartedOrder.map((step) => ({ step, complete: false })),
  })
}

/** The text of the card of a sign-in page, as a person reads it. */
export function cardText(view: HTMLElement, label: string): string {
  const card = view.querySelector(`section[aria-label="${label}"]`)
  if (!card) throw new Error(`No card ${label}`)
  return textOf(card.innerHTML)
}
