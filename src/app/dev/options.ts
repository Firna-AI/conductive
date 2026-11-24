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
  CAPABILITY_SCENARIOS,
  type CapabilityScenario,
} from './capability-note-seed'
import {
  DEV_BRANCH_CHECKS,
  DEV_BRANCH_LISTS,
  type DevBranchCheck,
  type DevBranchList,
} from './branch-routes'
import type { DevQueue } from './queue-routes'
import { SECRET_SCENARIOS, type SecretScenario } from './secret-request-seed'
import { DEV_SKILL_READS, type DevSkillRead } from './skill-tab-routes'

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
  'wake-finished',
  'wake-failed',
  'wake-stopped',
  'wake-other-workspace',
  'wake-during-turn',
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

const MERGE_QUEUES = [
  'open',
  'one',
  'two',
] as const satisfies readonly DevQueue[]

/** Endpoint model lists and hosts for save and Refresh previews. */
const MODEL_LISTS = ['unlisted', 'none', 'v1-only', 'read-failed'] as const

/** The org login seeds of Acme. */
const ORG_LOGINS = ['endpoint', 'unlisted', 'every-member'] as const

/** The logins of the open sessions of `checkout-autocomplete`. */
const SESSION_LOGINS = ['org', 'removed', 'empty'] as const

/** The states of the invite code of the user, besides the pause. */
const INVITE_CODES = ['left', 'used-up', 'disabled'] as const

/** The states of the skills repository of Acme, as the mockups name them. */
const SKILLS = [
  'none',
  'private',
  'not-found',
  'without-skills',
  'incomplete',
  'lookup-failed',
  'expired',
] as const

export type DevSkills = (typeof SKILLS)[number]

type DevInviteCode = (typeof INVITE_CODES)[number]

/**
 * The provider accounts of the dev fake: `boat` and `e2b` by default, `boat`
 * only, three accounts, or both with a read that fails.
 */
const PROVIDER_PRESETS = ['two', 'one', 'three', 'fail'] as const

type DevProviderPreset = (typeof PROVIDER_PRESETS)[number]

/** The preview state of the dev fake. See ../dev-fake.md for query options. */
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
  /** The first save of the skills repository fails. */
  skillsSaveFails: boolean
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
  /** The state of the skills repository of Acme, or `null` for its list. */
  skills: DevSkills | null
  /** Acme trusts its saved skills repository. */
  skillsTrusted: boolean
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
  /** The merge queue of Acme, or null for none, as `seedMergeQueue` says. */
  mergeQueue: DevQueue | null
  /** The notes of capability changes in `checkout-autocomplete`, or null. */
  capabilities: CapabilityScenario | null
  /**
   * `checkout-autocomplete` has a skills report and two sent messages with
   * skill chips, whose skill tabs read the texts of the dev fake.
   */
  skillChips: boolean
  /** The answer of each skill read in place of the text, or null. */
  skillRead: DevSkillRead | null
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
    skillsSaveFails: params.get('skillsSave') === 'fail',
    feedback: pick(params, 'feedback', FEEDBACK) ?? 'ready',
    reviewRuns: pick(params, 'runs', REVIEW_RUNS) ?? null,
    runWorkspace: pick(params, 'run', RUN_WORKSPACES) ?? null,
    waiting,
    invited: params.get('invited') === '1',
    paused: params.get('paused') === '1',
    waitlistOff: params.get('waitlist') === 'off',
    inviteCode: pick(params, 'inviteCode', INVITE_CODES) ?? 'left',
    skills: pick(params, 'skills', SKILLS) ?? null,
    skillsTrusted: params.get('skillsTrust') === 'trusted',
    branches: pick(params, 'branches', DEV_BRANCH_LISTS) ?? 'list',
    branchCheck: pick(params, 'branchCheck', DEV_BRANCH_CHECKS) ?? 'found',
    providers: pick(params, 'providers', PROVIDER_PRESETS) ?? 'two',
    providerSaveFails: params.get('providerSave') === 'fail',
    switches: params.get('switches') === '1',
    switchSaveFails: params.get('switchSave') === 'fail',
    secrets: pick(params, 'secrets', SECRET_SCENARIOS) ?? null,
    mergeQueue: pick(params, 'mergeQueue', MERGE_QUEUES) ?? null,
    capabilities: pick(params, 'capabilities', CAPABILITY_SCENARIOS) ?? null,
    skillChips:
      params.get('skillChips') === '1' ||
      pick(params, 'skillRead', DEV_SKILL_READS) !== undefined,
    skillRead: pick(params, 'skillRead', DEV_SKILL_READS) ?? null,
  }
}

function stopAfter(value: string | null): number | null {
  if (value === null || !/^\d{1,3}$/.test(value)) return null
  return Number(value) * 1000
}
