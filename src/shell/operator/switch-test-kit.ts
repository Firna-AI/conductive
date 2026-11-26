import { routes } from '../../app/router'
import { operatorOrgPath, type OperatorOrgDetail } from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import type {
  OperatorOrgSwitchResponse,
  OperatorProviderSwitch,
} from '../../shared/operator-switch'
import { byRole, queryByText } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { sampleSwitch } from '../../test-support/fixtures/operator-switch'
import { serveOperator } from '../../test-support/operator'
import { click } from '../test-mount'
import { textOf } from '../test-render'
import { boxOf, boxText, mountShell } from './operator-test-kit'
import { failure, reply } from './providers-test-kit'

/** The replies and the controls that the tests of Switch account share. */
export const MINUTE = 60_000

/** Kestrel Labs, an org in use on `boat`, with an active admin and no build that runs. */
export const QUIET_ORG = 'org_k3str3l'

/** The title of the box of the account. */
export const ACCOUNT_BOX = 'Provider account'

/**
 * A switch of Kestrel Labs from `boat` to `e2b`, which the operator of the
 * samples started 12 minutes ago, at 07:48, in the state of `change`.
 */
export function quietSwitch(
  change: Partial<OperatorProviderSwitch>,
): OperatorProviderSwitch {
  return sampleSwitch(QUIET_ORG, FAKE_TIME - 12 * MINUTE, change)
}

/** The reply of the configured accounts with these IDs. */
export function accountsReply(ids: readonly string[]) {
  return reply(ids.map((id) => [id, 0, 0] as const))
}

/**
 * The page of a sample org whose detail the API gives, or the change that
 * `change` makes to it, with its first reads. The configured accounts are
 * `accounts`, or `boat` and `e2b`, and `failed` fails their read. `box`
 * gives the text of the box of the account.
 */
export async function openOrgPage(
  orgId: string,
  options: {
    change?: (org: OperatorOrgDetail) => OperatorOrgDetail
    accounts?: readonly string[] | 'failed'
  } = {},
) {
  const server = new FakeApiServer()
  const fixtures = serveOperator(server)
  const sample = fixtures.orgs.find((item) => item.id === orgId)
  if (!sample) throw new Error(`The samples have no org ${orgId}.`)
  const org = options.change ? options.change(sample) : sample
  server.json('GET', operatorOrgPath(orgId), org)
  if (options.accounts === 'failed') {
    server.json('GET', operatorProvidersPath(), failure, 500)
  } else if (options.accounts) {
    server.json('GET', operatorProvidersPath(), accountsReply(options.accounts))
  }
  const shell = await mountShell(server, routes.operatorOrg(orgId))
  const box = () => boxText(shell.view, ACCOUNT_BOX)
  return { server, org, box, ...shell }
}

/** Presses the action of the box of the account, such as Switch account. */
export function pressBox(view: HTMLElement, label: string) {
  const box = boxOf(view, ACCOUNT_BOX)
  if (!box) throw new Error('The page has no box of the account.')
  click(byRole('button', label, box))
}

/** The text of the open question with this title. */
export function questionText(title: string) {
  return textOf(byRole('dialog', title).innerHTML)
}

/** Presses a button of the open question with this title. */
export function pressQuestion(title: string, label: string) {
  click(byRole('button', label, byRole('dialog', title)))
}

/** The lines of `lines` that the open question with this title shows. */
export function shownIn(title: string, lines: readonly string[]) {
  const dialog = byRole('dialog', title)
  return lines.filter((line) => queryByText(line, dialog) !== null)
}

/** The switch of Kestrel Labs whose build runs on e2b since now. */
export const buildingSwitch = quietSwitch({
  state: 'building',
  buildId: 'switch-build',
  buildStartedAt: FAKE_TIME,
})

/** The reply of Switch account or Stop switch with this switch. */
export function switchReply(
  item: OperatorOrgSwitchResponse['switch'],
): OperatorOrgSwitchResponse {
  return { switch: item }
}
