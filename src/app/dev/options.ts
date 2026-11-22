import type { OrgRole } from '../../shared/api'
import { ARCHIVED_COMPUTER_STATES } from '../../shared/archived-computer-read'
import type { ArchivedComputerState } from '../../shared/generated/ArchivedComputerState'
import type { BannerState } from '../../shared/github'
import type { GetStartedStep } from '../../shared/onboarding'
import { WORKSPACE_STATES } from '../../shared/workspace-read'
import type { FakeApiOptions } from '../../test-support/fake-api'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { getStartedOrder } from '../get-started'
import type { DevUploadMode } from './attachment-routes'
import {
  DEV_BRANCH_CHECKS,
  DEV_BRANCH_LISTS,
  type DevBranchCheck,
  type DevBranchList,
} from './branch-routes'
import { SECRET_SCENARIOS, type SecretScenario } from './secret-request-seed'

const ROLES = ['admin', 'member'] as const satisfies readonly OrgRole[]

const CONVERSATIONS = [
  'history',
  'running',
  'steer',
  'interrupted',
  'failed',
  'queued',
  'first-turn',
  'sent-by',
  'stopped-from',
] as const satisfies readonly RecordedChatScenario[]

/** The run lists of Review pull requests that the mockups also draw. */
const REVIEW_RUNS = ['failed', 'skipped'] as const

/** The runs whose workspace `checkout-autocomplete` can be. */
const RUN_WORKSPACES = ['pull-request', 'schedule'] as const
const UPLOADS = ['wait', 'fail'] as const satisfies readonly DevUploadMode[]
const FEEDBACK = ['ready', 'fail', 'no-email', 'limit'] as const

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

/** Endpoint model lists and hosts for save and Refresh previews. */
const MODEL_LISTS = ['unlisted', 'none', 'v1-only', 'read-failed'] as const

/** The org login seeds of Acme. */
const ORG_LOGINS = ['endpoint', 'unlisted', 'every-member'] as const

/** The logins of the open sessions of `checkout-autocomplete`. */
const SESSION_LOGINS = ['org', 'removed', 'empty'] as const

/** The states of the invite code of the user, besides the pause. */
const INVITE_CODES = ['left', 'used-up', 'disabled'] as const

type DevInviteCode = (typeof INVITE_CODES)[number]

/**
 * The provider accounts of the dev fake: `boat` and `e2b` by default, `boat`
 * only, three accounts, or both with a read that fails.
 */
const PROVIDER_PRESETS = ['two', 'one', 'three', 'fail'] as const

type DevProviderPreset = (typeof PROVIDER_PRESETS)[number]

/**
 * The preview state of the dev fake, from the query string of the page,
 * such as `/?role=member&workspace=stopped`. An unknown value is ignored,
 * so its default applies.
 *
 * - `role=admin|member`: the role of the user in the recorded orgs.
 * - `workspace=<state>`: the state of `checkout-autocomplete`.
 * - `archivedComputer=may-exist|deleted|unknown`: each archived workspace of
 *   Acme has that state of its cloud computer, with the end of its 14 days,
 *   as the Worker sends it. These are `checkout-autocomplete` with
 *   `workspace=archived`, and the removed `postcode-lookup`. Neither names a
 *   kept cloud computer, so `may-exist` shows an unresolved create request.
 *   Without the option, their records have none, as from an older Worker.
 * - `conversation=<scenario>`: its recorded chat, such as `running`.
 * - `banner=<state>`: its GitHub banner, such as `merged`. Its list mark
 *   shows the GitHub state of that bar.
 * - `paths=masked`: two files whose real paths hold a fake secret value,
 *   with their labels, in the file lists and at the end of each turn.
 * - `subWorkspaces=1`: Acme also has the sub-workspaces of the mockups,
 *   nested under Apple Pay button and Checkout address autocomplete, down
 *   to depth 3, so the list shows two trees in Checkout.
 * - `firstRun=github-app|org|agent-login`: Get started is not done from
 *   that step on. With `github-app` or `org`, the user has no org until
 *   Create org runs. In each first run, no agent login is connected.
 * - `login=none`: no agent login is connected.
 * - `login=endpoint`: both agents have a shared own endpoint login.
 * - `modelList=unlisted|none`: with `login=endpoint`, the last model list of
 *   the Claude login does not name the last Claude model of the app, or
 *   names no Claude model of the app. The list was read 4 minutes before
 *   the fake starts. Refresh and a save read a list that names every model.
 * - `modelList=v1-only|read-failed`: with `login=endpoint`, use the fake
 *   host that lists only under /v1, or the host that never lists models.
 *   With `read-failed`, the Claude login keeps a list from a day before
 *   that does not name the last Claude model of the app.
 * - `orgLogin=endpoint|unlisted|every-member`: Acme has an org login of
 *   Claude on its gateway, whose last model list names every Claude model
 *   of the app, or lacks the last one. With `every-member`, its switch
 *   "Use for every member" is on. The account names the default login of
 *   each org and agent, as the Worker does.
 * - `sessionLogin=org|removed`: each open session of
 *   `checkout-autocomplete` runs on the org login of Acme, as after a
 *   first message on it. With `removed`, an admin removed that login
 *   later, so the records say that it is not available.
 * - `sessionLogin=empty`: `checkout-autocomplete` also has an empty
 *   session that Cal started. Its record names the default login of Cal,
 *   which its first message takes, as the Worker resolves it, such as the
 *   org login with `orgLogin=every-member`.
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
 * - `upload=wait|fail`: no part of an upload gets an answer, so each file
 *   keeps uploading, or the first part of the page fails at each of its
 *   sends, so its chip fails once, after the waits of its retries of about
 *   7 seconds, and Try again works.
 * - `shareSave=fail`: each change of the share setting of an agent login,
 *   and of the switch "Use for every member" of an org login, fails, so
 *   the page shows that the change was not saved.
 * - `runs=failed|skipped`: the Runs list of Review pull requests holds a
 *   failed run of each cause, or the skipped runs of accounts outside Acme.
 * - `run=pull-request|schedule`: `checkout-autocomplete` is the workspace
 *   of a run, of Review pull requests for #482 or of an hourly run of
 *   Triage new errors. So its header shows the line of the run.
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
 * - `waitlist=off`: the operator of the samples turned the waitlist off.
 *   Unless sign-ups are paused, a person who waits gets app access at the
 *   next request, with no use of a code, so Get started opens. The operator
 *   section shows the switch off, and Zed K as a person who came back and
 *   got in by open sign-up. The Account page names open sign-up.
 * - `inviteCode=used-up|disabled`: every invite of the code of the user is
 *   used, or an operator turned the code off. The operator section shows
 *   the same code.
 * - `branches=loading|failed|no-access`: the branch list of New workspace
 *   never answers, fails as a read of GitHub does, or says that the GitHub
 *   account cannot read the repository.
 * - `branchCheck=missing|no-access`: a create that names a branch other
 *   than the default branch gets the refusal of a branch that is no longer
 *   on GitHub, or of a GitHub account that cannot read the repository.
 * - `providers=one|three|fail`: the configured provider accounts of the
 *   Providers tab and of the account choice of Create org: `boat` only,
 *   `boat`, `e2b`, and `e2b-us`, or `boat` and `e2b` with a read that
 *   fails. Without it, the accounts are `boat` and `e2b`.
 * - `providerSave=fail`: each save of the weights of new orgs fails, so
 *   the Providers tab shows that the weights were not saved.
 * - `switches=1`: sample orgs of the operator section show each state of a
 *   switch of the provider account, as `switch-seed.ts` lists them.
 * - `switchSave=fail`: each Switch account and Stop switch fails, so the
 *   question shows its error.
 */
export interface DevOptions {
  /** The options of the recorded server. */
  server: FakeApiOptions
  /** The state of the cloud computer of each archived workspace, or null. */
  archivedComputer: ArchivedComputerState | null
  /** The first step of Get started that is not done, or `null`. */
  firstRun: GetStartedStep | null
  noAgentLogin: boolean
  endpointLogins: boolean
  /** The seeded endpoint model list or the fake endpoint host. */
  modelList: (typeof MODEL_LISTS)[number] | null
  /** The seeded org login of Acme, or `null` for none. */
  orgLogin: (typeof ORG_LOGINS)[number] | null
  /**
   * The login of the open sessions of `checkout-autocomplete`, or the empty
   * session of Cal beside them, or `null`.
   */
  sessionLogin: (typeof SESSION_LOGINS)[number] | null
  deleted: boolean
  suspended: boolean
  operator: boolean
  signedOut: boolean
  /** The wait before an open workspace stops, or `null` for no stop. */
  stopAfterMs: number | null
  /** What each file upload does. */
  upload: DevUploadMode
  shareSaveFails: boolean
  feedback: (typeof FEEDBACK)[number]
  /** The run list of Review pull requests in place of its newest runs. */
  reviewRuns: (typeof REVIEW_RUNS)[number] | null
  /** The run whose workspace `checkout-autocomplete` is, or null. */
  runWorkspace: (typeof RUN_WORKSPACES)[number] | null
  /** The user waits for app access, with a verified email or none. */
  waiting: 'verified' | 'none' | null
  invited: boolean
  paused: boolean
  waitlistOff: boolean
  inviteCode: DevInviteCode
  /** How the branch list answers. */
  branches: DevBranchList
  /** How the branch check of a create answers a named branch. */
  branchCheck: DevBranchCheck
  providers: DevProviderPreset
  providerSaveFails: boolean
  switches: boolean
  switchSaveFails: boolean
  /** The state of the secret requests of `checkout-autocomplete`, or null. */
  secrets: SecretScenario | null
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
      subWorkspaces: params.get('subWorkspaces') === '1',
    },
    archivedComputer:
      pick(params, 'archivedComputer', ARCHIVED_COMPUTER_STATES) ?? null,
    // A person who waits has a new account, unless the options say otherwise.
    firstRun: firstRun ?? (waiting === null ? null : 'github-app'),
    noAgentLogin: params.get('login') === 'none',
    endpointLogins: params.get('login') === 'endpoint',
    modelList: pick(params, 'modelList', MODEL_LISTS) ?? null,
    orgLogin: pick(params, 'orgLogin', ORG_LOGINS) ?? null,
    sessionLogin: pick(params, 'sessionLogin', SESSION_LOGINS) ?? null,
    deleted: params.get('deleted') === '1',
    suspended: params.get('suspended') === '1',
    operator,
    signedOut: params.get('signedOut') === '1',
    stopAfterMs: stopAfter(params.get('stop')),
    upload: pick(params, 'upload', UPLOADS) ?? 'ready',
    shareSaveFails: params.get('shareSave') === 'fail',
    feedback: pick(params, 'feedback', FEEDBACK) ?? 'ready',
    reviewRuns: pick(params, 'runs', REVIEW_RUNS) ?? null,
    runWorkspace: pick(params, 'run', RUN_WORKSPACES) ?? null,
    waiting,
    invited: params.get('invited') === '1',
    paused: params.get('paused') === '1',
    waitlistOff: params.get('waitlist') === 'off',
    inviteCode: pick(params, 'inviteCode', INVITE_CODES) ?? 'left',
    branches: pick(params, 'branches', DEV_BRANCH_LISTS) ?? 'list',
    branchCheck: pick(params, 'branchCheck', DEV_BRANCH_CHECKS) ?? 'found',
    providers: pick(params, 'providers', PROVIDER_PRESETS) ?? 'two',
    providerSaveFails: params.get('providerSave') === 'fail',
    switches: params.get('switches') === '1',
    switchSaveFails: params.get('switchSave') === 'fail',
    secrets: pick(params, 'secrets', SECRET_SCENARIOS) ?? null,
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
