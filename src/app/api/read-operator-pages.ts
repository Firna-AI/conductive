import type {
  OperatorOrgDetail,
  OperatorSuspension,
  OperatorUserDetail,
} from '../../shared/operator'
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
  texts,
} from './parse'
import { ROLES } from './read-core'
import { readRunning, readWorkspaceStates } from './read-operator'

function readSuspension(value: unknown): OperatorSuspension {
  const suspension = record(value, 'suspension')
  return {
    suspendedAt: count(suspension, 'suspendedAt'),
    operator: maybeNested(suspension, 'operator', (item) => {
      const operator = record(item, 'operator')
      return {
        githubId: count(operator, 'githubId'),
        login: text(operator, 'login'),
      }
    }),
  }
}

/** The page of one org: its details, workspaces, members, and state. */
export function readOperatorOrg(value: unknown): OperatorOrgDetail {
  const org = record(value, 'org')
  return {
    id: text(org, 'id'),
    name: text(org, 'name'),
    initials: maybeText(org, 'initials'),
    createdAt: count(org, 'createdAt'),
    repositories: count(org, 'repositories'),
    workspaceStates: nested(org, 'workspaceStates', readWorkspaceStates),
    running: nested(org, 'running', readRunning),
    members: items(org, 'members', (item) => {
      const member = record(item, 'member')
      return {
        githubId: count(member, 'githubId'),
        login: text(member, 'login'),
        name: maybeText(member, 'name'),
        role: choice(member, 'role', ROLES),
        suspended: flag(member, 'suspended'),
      }
    }),
    suspension: maybeNested(org, 'suspension', readSuspension),
    deletion: maybeNested(org, 'deletion', (item) => {
      const deletion = record(item, 'deletion')
      return {
        deletedAt: count(deletion, 'deletedAt'),
        purgeAt: maybeCount(deletion, 'purgeAt'),
      }
    }),
  }
}

/** The page of one user: their details, workspaces, orgs, and state. */
export function readOperatorUser(value: unknown): OperatorUserDetail {
  const user = record(value, 'user')
  return {
    githubId: count(user, 'githubId'),
    login: text(user, 'login'),
    name: maybeText(user, 'name'),
    joinedAt: count(user, 'joinedAt'),
    workspaces: nested(user, 'workspaces', (item) => {
      const workspaces = record(item, 'workspaces')
      return {
        total: count(workspaces, 'total'),
        running: count(workspaces, 'running'),
      }
    }),
    orgs: items(user, 'orgs', (item) => {
      const org = record(item, 'org')
      return {
        id: text(org, 'id'),
        name: text(org, 'name'),
        initials: maybeText(org, 'initials'),
        role: choice(org, 'role', ROLES),
      }
    }),
    suspension: maybeNested(user, 'suspension', readSuspension),
  }
}

/**
 * The cloud computers whose stop has not finished after a suspension: the
 * workspaces and the builds that the reply names.
 */
export function readPendingStops(value: unknown): number {
  const reply = record(value, 'suspension')
  return (
    texts(reply, 'pendingWorkspaceIds').length +
    texts(reply, 'pendingBuildIds').length
  )
}

/** The reply of a lift, which the page reads again after. */
export function readLift(value: unknown): void {
  const reply = record(value, 'lift')
  maybeCount(reply, 'liftedAt')
  texts(reply, 'pendingWorkspaceIds')
}
