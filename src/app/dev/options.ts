import type { OrgRole } from '../../shared/api'
import type { BannerState } from '../../shared/github'
import type { GetStartedStep } from '../../shared/onboarding'
import type { FakeApiOptions } from '../../test-support/fake-api'
import { FAKE_IMPORTS } from '../../test-support/fake-import-routes'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { WORKSPACE_STATES } from '../api/read-workspaces'
import { getStartedOrder } from '../get-started'
import type { DevUploadMode } from './attachment-routes'
import type { DevBranchMode } from './branch-routes'
import type { DevImportScan, DevImportUpload } from './import-routes'

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
] as const satisfies readonly RecordedChatScenario[]

/** The run lists of Review pull requests that the mockups also draw. */
const REVIEW_RUNS = ['failed', 'skipped'] as const

/** The runs whose workspace `checkout-autocomplete` can be. */
const RUN_WORKSPACES = ['pull-request', 'schedule'] as const
const UPLOADS = ['wait', 'fail'] as const satisfies readonly DevUploadMode[]
const FEEDBACK = ['ready', 'fail', 'no-email'] as const

const BRANCHES = ['wait', 'fail'] as const satisfies readonly DevBranchMode[]

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

const IMPORT_SCANS = [
  'rows',
  'empty',
  'consent',
] as const satisfies readonly DevImportScan[]

const IMPORT_UPLOADS = [
  'ok',
  'fail',
] as const satisfies readonly DevImportUpload[]

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
 * - `imported=inactive|starting|failed|stopped|ready|archived`:
 *   `checkout-autocomplete` came from an import of Conductor, in that
 *   state, with its old sessions. Activate runs the steps of an
 *   activation.
 * - `mac=1`: the page is the Mac app on the Mac of the user, with its
 *   pairing, so it shows This Mac and the import from Conductor.
 *   `importScan=rows|empty|consent` picks what a scan finds, and
 *   `importUpload=fail` stops the first upload of each row before Try again.
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
 * - `upload=wait|fail`: each file upload never ends, or the first upload of
 *   each file name fails once, so Try again works.
 * - `branches=wait|fail`: each read of the branch picker never ends, or the
 *   first read fails once, so Try again works.
 * - `shareSave=fail`: each change of the share setting of an agent login
 *   fails, so the account shows that the change was not saved.
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
  /** What each file upload does. */
  upload: DevUploadMode
  /** What each read of the branch picker does. */
  branches: DevBranchMode
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
  /** What a scan of the Mac finds, and what its uploads do. */
  importScan: DevImportScan
  importUpload: DevImportUpload
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
      imported: pick(params, 'imported', FAKE_IMPORTS),
      onMac: params.get('mac') === '1',
    },
    // A person who waits has a new account, unless the options say otherwise.
    firstRun: firstRun ?? (waiting === null ? null : 'github-app'),
    noAgentLogin: params.get('login') === 'none',
    deleted: params.get('deleted') === '1',
    suspended: params.get('suspended') === '1',
    operator,
    signedOut: params.get('signedOut') === '1',
    stopAfterMs: stopAfter(params.get('stop')),
    upload: pick(params, 'upload', UPLOADS) ?? 'ready',
    branches: pick(params, 'branches', BRANCHES) ?? 'ready',
    shareSaveFails: params.get('shareSave') === 'fail',
    feedback: pick(params, 'feedback', FEEDBACK) ?? 'ready',
    reviewRuns: pick(params, 'runs', REVIEW_RUNS) ?? null,
    runWorkspace: pick(params, 'run', RUN_WORKSPACES) ?? null,
    waiting,
    invited: params.get('invited') === '1',
    paused: params.get('paused') === '1',
    waitlistOff: params.get('waitlist') === 'off',
    inviteCode: pick(params, 'inviteCode', INVITE_CODES) ?? 'left',
    importScan: pick(params, 'importScan', IMPORT_SCANS) ?? 'rows',
    importUpload: pick(params, 'importUpload', IMPORT_UPLOADS) ?? 'ok',
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
