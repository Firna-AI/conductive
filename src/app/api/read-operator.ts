import type {
  OperatorOrgMatch,
  OperatorOrgSummary,
  OperatorOverview,
  OperatorUserSummary,
  OperatorWorkspaceStates,
} from '../../shared/operator'
import {
  choice,
  count,
  items,
  maybeText,
  nested,
  record,
  text,
  type JsonObject,
} from './parse'

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
    githubId: count(user, 'githubId'),
    login: text(user, 'login'),
    name: maybeText(user, 'name'),
    joinedAt: count(user, 'joinedAt'),
    orgs: count(user, 'orgs'),
    workspaces: count(user, 'workspaces'),
    status: choice(user, 'status', ['active', 'suspended']),
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
