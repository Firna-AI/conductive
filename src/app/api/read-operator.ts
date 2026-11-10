import type {
  OperatorOrgMatch,
  OperatorOrgSummary,
  OperatorOverview,
  OperatorUserSummary,
  OperatorWorkspaceStates,
} from '../../shared/operator'
import type {
  OperatorAccessSource,
  OperatorUserAccess,
} from '../../shared/operator-waitlist'
import {
  choice,
  count,
  flag,
  items,
  maybeCount,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
  type JsonObject,
} from './parse'
import {
  readAccessCode,
  readApprovalEmail,
  readIdentity,
} from './read-operator-waitlist'

const ORG_MATCHES = [
  'org-id',
  'cloud-computer-id',
  'preview-address',
] as const satisfies readonly OperatorOrgMatch[]

/** A total, and the new ones of the last 7 days. */
function readWeekly(value: unknown, name: string) {
  const weekly = record(value, name)
  return { total: count(weekly, 'total'), lastWeek: count(weekly, 'lastWeek') }
}

/** The cloud computers that run now, for workspaces and for builds. */
export function readRunning(value: unknown) {
  const running = record(value, 'running')
  return {
    workspaces: count(running, 'workspaces'),
    builds: count(running, 'builds'),
  }
}

export function readWorkspaceStates(value: unknown): OperatorWorkspaceStates {
  const states = record(value, 'workspaceStates')
  return {
    running: count(states, 'running'),
    stopped: count(states, 'stopped'),
    failed: count(states, 'failed'),
    archived: count(states, 'archived'),
  }
}

function readDays(object: JsonObject, key: string) {
  return items(object, key, (value) => {
    const day = record(value, 'day')
    return { date: text(day, 'date'), count: count(day, 'count') }
  })
}

/** The numbers of the Overview, which the Worker reads in one batch. */
export function readOperatorOverview(value: unknown): OperatorOverview {
  const overview = record(value, 'overview')
  return {
    readAt: count(overview, 'readAt'),
    users: nested(overview, 'users', (item) => readWeekly(item, 'users')),
    waiting: count(overview, 'waiting'),
    orgs: nested(overview, 'orgs', (item) => readWeekly(item, 'orgs')),
    workspaces: nested(overview, 'workspaces', (item) =>
      readWeekly(item, 'workspaces'),
    ),
    running: nested(overview, 'running', readRunning),
    workspaceStates: nested(overview, 'workspaceStates', readWorkspaceStates),
    newWorkspacesByDay: readDays(overview, 'newWorkspacesByDay'),
    newUsersByDay: readDays(overview, 'newUsersByDay'),
    largestOrgs: items(overview, 'largestOrgs', (item) => {
      const org = record(item, 'org')
      return {
        id: text(org, 'id'),
        name: text(org, 'name'),
        initials: maybeText(org, 'initials'),
        members: count(org, 'members'),
        workspaces: count(org, 'workspaces'),
        running: count(org, 'running'),
      }
    }),
  }
}

/** One page of a list of the operator, with the cursor of the next. */
export interface DirectoryReply<Row> {
  rows: readonly Row[]
  total: number
  nextCursor: string | null
}

function readOrgSummary(value: unknown): OperatorOrgSummary {
  const org = record(value, 'org')
  const match = org.match
  return {
    id: text(org, 'id'),
    providerAccount: text(org, 'providerAccount'),
    name: text(org, 'name'),
    initials: maybeText(org, 'initials'),
    createdAt: count(org, 'createdAt'),
    members: count(org, 'members'),
    workspaces: count(org, 'workspaces'),
    running: count(org, 'running'),
    status: choice(org, 'status', ['active', 'suspended', 'deleted']),
    match:
      match === null || match === undefined
        ? null
        : choice(org, 'match', ORG_MATCHES),
  }
}

function readUserSummary(value: unknown): OperatorUserSummary {
  const user = record(value, 'user')
  return {
    ...readOperatorUserAccess(user),
    githubId: count(user, 'githubId'),
    login: text(user, 'login'),
    name: maybeText(user, 'name'),
    joinedAt: count(user, 'joinedAt'),
    orgs: count(user, 'orgs'),
    workspaces: count(user, 'workspaces'),
    status: choice(user, 'status', ['active', 'suspended']),
  }
}

function readAccessSource(value: unknown): OperatorAccessSource {
  const source = record(value, 'source')
  const kind = choice(source, 'kind', [
    'approval',
    'invite_code',
    'referral_code',
    'org_invitation',
    'operator',
    'existing',
  ])
  switch (kind) {
    case 'approval':
      return { kind, operator: maybeNested(source, 'operator', readIdentity) }
    case 'invite_code':
      return {
        kind,
        code: text(source, 'code'),
        label: maybeText(source, 'label'),
      }
    case 'referral_code':
      return {
        kind,
        code: text(source, 'code'),
        owner: maybeNested(source, 'owner', readIdentity),
      }
    case 'org_invitation':
      return {
        kind,
        org: nested(source, 'org', (value) => {
          const org = record(value, 'org')
          return { id: text(org, 'id'), name: maybeText(org, 'name') }
        }),
        invitedBy: maybeNested(source, 'invitedBy', readIdentity),
      }
    default:
      return { kind }
  }
}

function readAppAccess(value: unknown): OperatorUserAccess['appAccess'] {
  const access = record(value, 'appAccess')
  const state = choice(access, 'state', ['waiting', 'granted'])
  return state === 'waiting'
    ? { state, waitingSince: count(access, 'waitingSince') }
    : {
        state,
        grantedAt: count(access, 'grantedAt'),
        source: nested(access, 'source', readAccessSource),
      }
}

export function readOperatorUserAccess(user: JsonObject): OperatorUserAccess {
  return {
    appAccess: nested(user, 'appAccess', readAppAccess),
    approvalEmail: nested(user, 'approvalEmail', readApprovalEmail),
    hasVerifiedEmail: flag(user, 'hasVerifiedEmail'),
    githubCreatedAt: maybeCount(user, 'githubCreatedAt'),
    referralCode: maybeNested(user, 'referralCode', (value) => ({
      ...readAccessCode(value),
      recipients: items(record(value, 'referralCode'), 'recipients', (item) => {
        const recipient = record(item, 'recipient')
        return {
          ...readIdentity(recipient),
          name: maybeText(recipient, 'name'),
          usedAt: count(recipient, 'usedAt'),
        }
      }),
    })),
  }
}

/** A page of the Orgs tab. */
export function readOrgsPage(
  value: unknown,
): DirectoryReply<OperatorOrgSummary> {
  const page = record(value, 'orgs')
  return {
    rows: items(page, 'orgs', readOrgSummary),
    total: count(page, 'total'),
    nextCursor: maybeText(page, 'nextCursor'),
  }
}

/** A page of the Users tab. */
export function readUsersPage(
  value: unknown,
): DirectoryReply<OperatorUserSummary> {
  const page = record(value, 'users')
  return {
    rows: items(page, 'users', readUserSummary),
    total: count(page, 'total'),
    nextCursor: maybeText(page, 'nextCursor'),
  }
}
