import type { OrgRole } from '../../shared/api'
import type { BannerState } from '../../shared/github'
import type { GetStartedStep } from '../../shared/onboarding'
import type { FakeApiOptions } from '../../test-support/fake-api'
import type { RecordedChatScenario } from '../../test-support/recorded-chat'
import { WORKSPACE_STATES } from '../api/read-workspaces'
import { getStartedOrder } from '../get-started'
import type { DevUploadMode } from './attachment-routes'

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

const UPLOADS = ['wait', 'fail'] as const satisfies readonly DevUploadMode[]

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
 * - `signedOut=1`: the Worker refuses the session, so the sign-in shows.
 * - `stop=<seconds>`: an open workspace stops that many seconds after it
 *   opens, as a sandbox does that stops while its workspace is open.
 * - `upload=wait|fail`: each file upload never ends, or the first upload of
 *   each file name fails once, so Try again works.
 * - `shareSave=fail`: each change of the share setting of an agent login
 *   fails, so the account shows that the change was not saved.
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
  /** What each file upload does. */
  upload: DevUploadMode
  shareSaveFails: boolean
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
      paths: pick(params, 'paths', PATHS),
    },
    firstRun: pick(params, 'firstRun', getStartedOrder) ?? null,
    noAgentLogin: params.get('login') === 'none',
    deleted: params.get('deleted') === '1',
    suspended: params.get('suspended') === '1',
    signedOut: params.get('signedOut') === '1',
    stopAfterMs: stopAfter(params.get('stop')),
    upload: pick(params, 'upload', UPLOADS) ?? 'ready',
    shareSaveFails: params.get('shareSave') === 'fail',
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
