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

/** The run lists of Review pull requests that the mockups also draw. */
const REVIEW_RUNS = ['failed', 'skipped'] as const

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

/**
 * The preview state of the dev fake, from the query string of the page,
 * such as `/?role=member&workspace=stopped`. An unknown value is ignored,
 * so its default applies.
 *
 * - `role=admin|member`: the role of the user in the recorded orgs.
 * - `workspace=<state>`: the state of `checkout-autocomplete`.
 * - `conversation=<scenario>`: its recorded chat, such as `running`.
 * - `banner=<state>`: its GitHub banner, such as `merged`.
 * - `firstRun=github-app|org|agent-login`: Get started is not done from
 *   that step on. With `github-app` or `org`, the user has no org until
 *   Create org runs. In each first run, no agent login is connected.
 * - `login=none`: no agent login is connected.
 * - `deleted=1`: Acme is deleted, as its admins see it.
 * - `suspended=1`: the operator suspended Acme. Each write of Acme gets
 *   `org_suspended`, except a leave, as the Worker does.
 * - `signedOut=1`: the Worker refuses the session, so the sign-in shows.
 * - `stop=<seconds>`: an open workspace stops that many seconds after it
 *   opens, as a sandbox does that stops while its workspace is open.
 * - `shareSave=fail`: each change of the share setting of an agent login
 *   fails, so the account shows that the change was not saved.
 * - `runs=failed|skipped`: the Runs list of Review pull requests holds a
 *   failed run of each cause, or the skipped runs of accounts outside Acme.
 */
export interface DevOptions {
  /** The options of the recorded server. */
  server: FakeApiOptions
  /** The first step of Get started that is not done, or `null`. */
  firstRun: GetStartedStep | null
  noAgentLogin: boolean
  deleted: boolean
  suspended: boolean
  signedOut: boolean
  /** The wait before an open workspace stops, or `null` for no stop. */
  stopAfterMs: number | null
  shareSaveFails: boolean
  /** The run list of Review pull requests in place of its newest runs. */
  reviewRuns: (typeof REVIEW_RUNS)[number] | null
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

export function readDevOptions(search: string): DevOptions {
  const params = new URLSearchParams(search)
  return {
    server: {
      role: pick(params, 'role', ROLES),
      workspaceState: pick(params, 'workspace', WORKSPACE_STATES),
      conversation: pick(params, 'conversation', CONVERSATIONS),
      banner: pick(params, 'banner', BANNERS),
    },
    firstRun: pick(params, 'firstRun', getStartedOrder) ?? null,
    noAgentLogin: params.get('login') === 'none',
    deleted: params.get('deleted') === '1',
    suspended: params.get('suspended') === '1',
    signedOut: params.get('signedOut') === '1',
    stopAfterMs: stopAfter(params.get('stop')),
    shareSaveFails: params.get('shareSave') === 'fail',
    reviewRuns: pick(params, 'runs', REVIEW_RUNS) ?? null,
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
