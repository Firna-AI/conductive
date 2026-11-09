import type { OrgRole } from '../../shared/api'
import type { BannerState } from '../../shared/github'
import type { GetStartedStep } from '../../shared/onboarding'
import type { FakeApiOptions } from '../../test-support/fake-api'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { WORKSPACE_STATES } from '../api/read-workspaces'
import { getStartedOrder } from '../get-started'

const ROLES = ['admin', 'member'] as const satisfies readonly OrgRole[]

const CONVERSATIONS = [
  'history',
  'running',
  'steer',
  'interrupted',
  'failed',
  'queued',
  'first-turn',
] as const satisfies readonly RecordedChatScenario[]

const BANNERS = [
  'none',
  'no-commits',
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
  'conflict',
  'changes-requested',
  'draft',
  'closed',
  'blocked',
] as const satisfies readonly BannerState[]

const PATHS = ['plain', 'masked'] as const

/** The states of the invite code of the user, besides the pause. */
const INVITE_CODES = ['left', 'used-up', 'disabled'] as const

type DevInviteCode = (typeof INVITE_CODES)[number]

/**
 * The preview state of the dev fake, from the query string of the page,
 * such as `/?role=member&workspace=stopped`. An unknown value is ignored,
 * so its default applies.
 *
 * - `role=admin|member`: the role of the user in the recorded orgs.
 * - `workspace=<state>`: the state of `checkout-autocomplete`.
 * - `conversation=<scenario>`: its recorded chat, such as `running`.
 * - `banner=<state>`: its GitHub banner, such as `merged`.
 * - `paths=masked`: two files whose real paths hold a fake secret value,
 *   with their labels, in the file lists and at the end of each turn.
 * - `firstRun=github-app|org|agent-login`: Get started is not done from
 *   that step on. With `github-app` or `org`, the user has no org until
 *   Create org runs. In each first run, no agent login is connected.
 * - `login=none`: no agent login is connected.
 * - `deleted=1`: Acme is deleted, as its admins see it.
 * - `suspended=1`: the operator suspended Acme. Each write of Acme gets
 *   `org_suspended`, except a leave, as the Worker does.
 * - `operator=1`: the user is an operator. The rail and the org switcher
 *   show Operator, and the operator section shows the sample orgs and
 *   users of the mockups. Without it, each operator request gets
 *   `operator_required`, as the Worker does.
 * - `signedOut=1`: the Worker refuses the session, so the sign-in shows.
 * - `stop=<seconds>`: an open workspace stops that many seconds after it
 *   opens, as a sandbox does that stops while its workspace is open.
 * - `shareSave=fail`: each change of the share setting of an agent login
 *   fails, so the account shows that the change was not saved.
 * - `waiting=1`: the user is Sam Okafor, who waits for app access, with a
 *   verified email, so the app shows the waitlist. `waiting=no-email`: the
 *   same account without a verified email. Sam starts as a new account, as
 *   `firstRun=github-app` does, unless `firstRun` says otherwise. With
 *   `operator=1`, nobody waits, as an operator gets app access.
 * - `invited=1`: with `waiting`, an invitation of Acme waits for Sam.
 *   Accept makes Sam a member of Acme, with app access.
 * - `paused=1`: sign-ups are paused. A use of a code and the Accept of a
 *   person who waits get `signups_paused`, and nothing is used up. The
 *   operator section shows the same pause, by the operator of the samples.
 * - `inviteCode=used-up|disabled`: every invite of the code of the user is
 *   used, or an operator turned the code off. The operator section shows
 *   the same code.
 */
export interface DevOptions {
  /** The options of the recorded server. */
  server: FakeApiOptions
  /** The first step of Get started that is not done, or `null`. */
  firstRun: GetStartedStep | null
  noAgentLogin: boolean
  deleted: boolean
  suspended: boolean
  operator: boolean
  signedOut: boolean
  /** The wait before an open workspace stops, or `null` for no stop. */
  stopAfterMs: number | null
  shareSaveFails: boolean
  /** The user waits for app access, with a verified email or none. */
  waiting: 'verified' | 'none' | null
  invited: boolean
  paused: boolean
  inviteCode: DevInviteCode
}

/** The value of `key` when it is one of `values`. */
function pick<T extends string>(
  params: URLSearchParams,
  key: string,
  values: readonly T[],
): T | undefined {
  const value = params.get(key)
  return values.find((item) => item === value)
}

function waitingOf(value: string | null): DevOptions['waiting'] {
  if (value === '1') return 'verified'
  return value === 'no-email' ? 'none' : null
}

export function readDevOptions(search: string): DevOptions {
  const params = new URLSearchParams(search)
  const operator = params.get('operator') === '1'
  // An operator gets app access at each sign-in, so an operator never waits.
  const waiting = operator ? null : waitingOf(params.get('waiting'))
  const firstRun = pick(params, 'firstRun', getStartedOrder) ?? null
  return {
    server: {
      role: pick(params, 'role', ROLES),
      workspaceState: pick(params, 'workspace', WORKSPACE_STATES),
      conversation: pick(params, 'conversation', CONVERSATIONS),
      banner: pick(params, 'banner', BANNERS),
      paths: pick(params, 'paths', PATHS),
    },
    // A person who waits has a new account, unless the options say otherwise.
    firstRun: firstRun ?? (waiting === null ? null : 'github-app'),
    noAgentLogin: params.get('login') === 'none',
    deleted: params.get('deleted') === '1',
    suspended: params.get('suspended') === '1',
    operator,
    signedOut: params.get('signedOut') === '1',
    stopAfterMs: stopAfter(params.get('stop')),
    shareSaveFails: params.get('shareSave') === 'fail',
    waiting,
    invited: params.get('invited') === '1',
    paused: params.get('paused') === '1',
    inviteCode: pick(params, 'inviteCode', INVITE_CODES) ?? 'left',
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
