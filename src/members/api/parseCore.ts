import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { OrgRole, User } from '../../shared/api'
import { createWorkspaceReader } from '../../shared/workspace-read'
import type {
  MembersResponse,
  OrgInvite,
  OrgMember,
} from '../../shared/members'
import type { WorkspacesResponse } from '../../shared/workspaces'
import {
  count,
  countOrNull,
  list,
  nested,
  object,
  oneOf,
  ResponseShapeError,
  text,
  textOrNull,
  type JsonObject,
} from './json'

const roles: Readonly<Record<OrgRole, OrgRole>> = {
  admin: 'admin',
  member: 'member',
}
const agents: Readonly<Record<Agent, Agent>> = {
  claude: 'claude',
  codex: 'codex',
}
const efforts: Readonly<Record<Effort, Effort>> = {
  none: 'none',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
  ultra: 'ultra',
}

function sender(source: JsonObject): MessageSender {
  return {
    id: text(source, 'id'),
    githubLogin: text(source, 'githubLogin'),
    displayName: textOrNull(source, 'displayName'),
    avatarUrl: textOrNull(source, 'avatarUrl'),
  }
}

function user(source: JsonObject): User {
  return { ...sender(source), githubId: count(source, 'githubId') }
}

export function parseMember(value: unknown): OrgMember {
  const source = object(value, 'member')
  return {
    user: user(nested(source, 'user')),
    role: oneOf(source, 'role', roles),
    joinedAt: count(source, 'joinedAt'),
  }
}

export function parseInvite(value: unknown): OrgInvite {
  const source = object(value, 'invite')
  return {
    id: text(source, 'id'),
    email: text(source, 'email'),
    createdAt: count(source, 'createdAt'),
  }
}

export function parseMembers(value: unknown): MembersResponse {
  const source = object(value, 'members response')
  return {
    members: list(source, 'members', parseMember),
    invites: list(source, 'invites', parseInvite),
  }
}

function agentChoice(source: JsonObject): AgentChoice {
  return {
    agent: oneOf(source, 'agent', agents),
    model: text(source, 'model'),
    effort: oneOf(source, 'effort', efforts),
    fast: source.fast === true,
  }
}

export const parseWorkspace = createWorkspaceReader({
  record: object,
  text,
  count,
  nullableText: textOrNull,
  nullableCount: countOrNull,
  sender: (value) => sender(object(value, 'owner')),
  choice: (value) => agentChoice(object(value, 'choice')),
  invalidState: () => new ResponseShapeError('state is not known'),
})

export function parseWorkspaces(value: unknown): WorkspacesResponse {
  const source = object(value, 'workspaces response')
  return { workspaces: list(source, 'workspaces', parseWorkspace) }
}

/** The single record that a response wraps, such as `{ member }`. */
export function field<T>(
  key: string,
  read: (value: unknown) => T,
): (value: unknown) => T {
  return (value) => read(object(value, `${key} response`)[key])
}
