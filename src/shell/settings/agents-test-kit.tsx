import type { Agent } from '../../shared/generated/Agent'
import { productName } from '../../shared/brand'
import type { AppModel } from '../../app/app-model'
import type { OrgAgentLoginStatus } from '../../shared/org-agent-logins'
import { orgSettingsPaths } from '../../shared/org-settings'
import { byRole } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { fieldNamed } from '../workspace/kept-test-kit'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { startedApp } from '../test-render'
import { OrgSettingsScreen } from './OrgSettingsScreen'

export const { org } = FAKE_IDS

/** The words of the tab and of its form, from the mockups. */
export const words = {
  description:
    'Members of Acme use these logins when they have none of their own.',
  memberNote: 'Only an admin can change them.',
  keep: `${productName} keeps it encrypted, and never shows it again.`,
  off: 'Use for every member Members without a login of their own use it.',
  on: 'Use for every member Every new session uses it, also for members with a login of their own.',
  note: `${productName} added /v1 to the address, because the endpoint lists its models there.`,
  warning: `${productName} couldn't read the model list of this endpoint. Check the address and the key.`,
} as const

/** The read of an agent that Acme has no org login for. */
export function noLogin(agent: Agent): OrgAgentLoginStatus {
  return { agent, connected: false }
}

/** An API key of Acme for `agent`, saved at the clock of the test. */
export function keyLogin(
  agent: Agent,
  everyMember = false,
): OrgAgentLoginStatus {
  return {
    agent,
    connected: true,
    kind: 'api-key',
    useForEveryMember: everyMember,
    updatedAt: FAKE_TIME,
  }
}

/**
 * The gateway of Acme as the org endpoint of `agent`, saved at the clock of
 * the test. With `missing`, its last model list, read a minute before that
 * clock, did not name those model IDs.
 */
export function gatewayLogin(
  agent: Agent,
  missing?: readonly string[],
  everyMember = false,
): OrgAgentLoginStatus {
  return {
    agent,
    connected: true,
    kind: 'endpoint',
    host: 'llm.acme.example.com',
    useForEveryMember: everyMember,
    updatedAt: FAKE_TIME,
    ...(missing
      ? { modelList: { missing, checkedAt: FAKE_TIME - 60_000 } }
      : {}),
  }
}

/** Serves the read of the org logins of Acme with `logins`. */
export function serveOrgLogins(
  server: FakeApiServer,
  logins: readonly OrgAgentLoginStatus[],
): void {
  server.json('GET', orgSettingsPaths.agentLogins(org), { agentLogins: logins })
}

/**
 * The Agents tab of Acme, for the person of the fake API, after its read,
 * with the services of the test, such as a fetch that holds answers.
 */
export async function openAgentsTab(
  server: FakeApiServer,
  services: Parameters<typeof startedApp>[1] = {},
): Promise<{ app: AppModel; view: HTMLElement }> {
  holdAnimationFrames()
  const app = await startedApp(server, services)
  const boot = app.boot.get()
  const acme = app.orgs.get().find((item) => item.id === org)
  if (boot.state !== 'ready' || !acme) throw new Error('The app did not start.')
  const view = mountScreen(
    app,
    <OrgSettingsScreen org={acme} tab="agents" user={boot.user} />,
  )
  await settle()
  return { app, view }
}

/** Fills the open form on Own endpoint with an address and a key. */
export function fillEndpoint(view: HTMLElement, address: string): void {
  click(
    byRole('radio', 'Own endpoint', byRole('radiogroup', 'Connect with', view)),
  )
  typeText(fieldNamed(view, 'Endpoint'), address)
  typeText(fieldNamed(view, 'API key'), 'key-of-the-gateway')
}
