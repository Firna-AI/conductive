import type { AgentModel } from '../../shared/generated/AgentModel'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { Effort } from '../../shared/generated/Effort'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { DefaultAgentLogin } from '../../shared/generated/DefaultAgentLogin'
import type { SessionLogin } from '../../shared/generated/SessionLogin'
import {
  NEW_WORKSPACE_VIEWS,
  type AccountResponse,
  type AgentLoginStatus,
  type EndpointModelList,
  type SetNewWorkspaceViewResponse,
} from '../../shared/account'

import type { OrgRole, User } from '../../shared/api'
import type { GetStartedResponse } from '../../shared/onboarding'
import type { OrgSummary } from '../../shared/orgs'
import type { Section } from '../../shared/sections'
import { getStartedOrder } from '../get-started'
import {
  choice,
  count,
  flag,
  items,
  maybeNested,
  maybeText,
  nested,
  record,
  text,
  texts,
  type JsonObject,
} from './parse'
import { readShortcuts } from './read-shortcuts'

export const AGENTS = ['claude', 'codex'] as const satisfies readonly Agent[]
const EFFORTS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultra',
] as const satisfies readonly Effort[]
export const ROLES = ['admin', 'member'] as const satisfies readonly OrgRole[]

export function readUser(value: unknown): User {
  const user = record(value, 'user')
  return {
    id: text(user, 'id'),
    githubId: count(user, 'githubId'),
    githubLogin: text(user, 'githubLogin'),
    displayName: maybeText(user, 'displayName'),
    avatarUrl: maybeText(user, 'avatarUrl'),
  }
}

export function readSender(value: unknown): MessageSender {
  const sender = record(value, 'sender')
  return {
    id: text(sender, 'id'),
    githubLogin: text(sender, 'githubLogin'),
    displayName: maybeText(sender, 'displayName'),
    avatarUrl: maybeText(sender, 'avatarUrl'),
  }
}

export function readOrg(value: unknown): OrgSummary {
  const org = record(value, 'org')
  const deletion = maybeNested(org, 'deletion', (item) => {
    const fields = record(item, 'deletion')
    return {
      deletedAt: count(fields, 'deletedAt'),
      deletesAt: count(fields, 'deletesAt'),
    }
  })
  const suspension = maybeNested(org, 'suspension', (item) => ({
    suspendedAt: count(record(item, 'suspension'), 'suspendedAt'),
  }))
  const initials = maybeText(org, 'initials')
  // A colour key that this client does not know stays, and draws as Blue.
  const color = maybeText(org, 'color')
  return {
    id: text(org, 'id'),
    name: text(org, 'name'),
    role: choice(org, 'role', ROLES),
    ...(initials === null ? {} : { initials }),
    ...(color === null ? {} : { color }),
    ...(suspension === null ? {} : { suspension }),
    ...(deletion === null ? {} : { deletion }),
  }
}

export function readSection(value: unknown): Section {
  const section = record(value, 'section')
  return {
    id: text(section, 'id'),
    orgId: text(section, 'orgId'),
    name: text(section, 'name'),
    position: count(section, 'position'),
    isDefault: flag(section, 'isDefault'),
    collapsed: flag(section, 'collapsed'),
  }
}

export function readChoice(value: unknown): AgentChoice {
  const fields = record(value, 'choice')
  return {
    agent: choice(fields, 'agent', AGENTS),
    model: text(fields, 'model'),
    effort: choice(fields, 'effort', EFFORTS),
    fast: fields.fast === true,
  }
}

export function readModel(value: unknown): AgentModel {
  const model = record(value, 'model')
  return {
    agent: choice(model, 'agent', AGENTS),
    model: text(model, 'model'),
    label: text(model, 'label'),
    ...(typeof model.fast === 'boolean' && { fast: model.fast }),
    efforts: items(model, 'efforts', (effort) =>
      choice({ effort }, 'effort', EFFORTS),
    ),
  }
}

/** The last model list of an own endpoint login that the Worker read. */
export function readEndpointModelList(value: unknown): EndpointModelList {
  const list = record(value, 'endpoint model list')
  return {
    missing: texts(list, 'missing'),
    checkedAt: count(list, 'checkedAt'),
  }
}

export function readLogin(value: unknown): AgentLoginStatus {
  const login = record(value, 'agent login')
  const agent = choice(login, 'agent', AGENTS)
  if (!flag(login, 'connected')) return { agent, connected: false }
  const updatedAt = count(login, 'updatedAt')
  const noReuse = flag(login, 'noReuse')
  if (login.kind === 'endpoint') {
    return {
      agent,
      connected: true,
      kind: 'endpoint',
      host: text(login, 'host'),
      ...(login.modelList === undefined
        ? {}
        : { modelList: nested(login, 'modelList', readEndpointModelList) }),
      noReuse,
      updatedAt,
    }
  }
  return {
    agent,
    connected: true,
    kind: choice(login, 'kind', ['token', 'api-key']),
    noReuse,
    updatedAt,
    ...(agent === 'codex' && login.unusableCause !== undefined
      ? { unusableCause: text(login, 'unusableCause') }
      : {}),
  }
}

/**
 * What says whether turns can run on a login of the user. The full login
 * status has these fields, and so do the narrower summaries of screens.
 */
export interface LoginUse {
  connected: boolean
  unusableCause?: string
}

/**
 * Whether turns can run on a login of the user: it is connected, and the
 * Worker gives no cause that stops it, such as a ChatGPT sign-in that
 * OpenAI did not renew. A login that is missing cannot run turns.
 */
export function loginUsable(login: LoginUse | undefined): boolean {
  return login?.connected === true && login.unusableCause === undefined
}

/**
 * The owner of a login: a member, or the org, such as the login of a
 * session or the login of the runs of an automation.
 */
export function readSessionLogin(value: unknown): SessionLogin {
  const login = record(value, 'session login')
  if (choice(login, 'type', ['personal', 'org']) === 'org') {
    return { type: 'org', orgId: text(login, 'orgId') }
  }
  return { type: 'personal', userId: text(login, 'userId') }
}

/**
 * The default login of the person for one org and one agent, as the
 * resolver of the Worker names it, without a credential. Each model list
 * is optional.
 */
function readDefaultLogin(value: unknown): DefaultAgentLogin {
  const entry = record(value, 'default login')
  const modelList = maybeNested(entry, 'modelList', readEndpointModelList)
  const orgModelList = maybeNested(entry, 'orgModelList', readEndpointModelList)
  return {
    orgId: text(entry, 'orgId'),
    orgName: text(entry, 'orgName'),
    agent: choice(entry, 'agent', AGENTS),
    login: maybeNested(entry, 'login', readSessionLogin),
    ...(modelList === null ? {} : { modelList }),
    ...(orgModelList === null ? {} : { orgModelList }),
  }
}

/**
 * The default logins that a reply names: the reply of the account, for each
 * org of the person, or the reply of the org logins, for that org. An older
 * reply has no `defaultLogins`, so it names no default login.
 */
export function readDefaultLogins(
  reply: JsonObject,
): Pick<AccountResponse, 'defaultLogins'> {
  return reply.defaultLogins === undefined
    ? {}
    : { defaultLogins: items(reply, 'defaultLogins', readDefaultLogin) }
}

/**
 * The account of the person signed in, with the default logins of each org
 * of the person, as `readDefaultLogins` says.
 */
export function readAccount(value: unknown): AccountResponse {
  const account = record(value, 'account')
  return {
    user: nested(account, 'user', readUser),
    defaultChoice: nested(account, 'defaultChoice', readChoice),
    favourites:
      account.favourites === undefined
        ? []
        : items(account, 'favourites', readChoice),
    newWorkspaceView: choice(account, 'newWorkspaceView', NEW_WORKSPACE_VIEWS),
    shortcuts: nested(account, 'shortcuts', readShortcuts),
    agentLogins: items(account, 'agentLogins', readLogin),
    ...readDefaultLogins(account),
    operator: flag(account, 'operator'),
    githubAppUrl: text(account, 'githubAppUrl'),
  }
}

export function readNewWorkspaceView(
  value: unknown,
): SetNewWorkspaceViewResponse {
  return { view: choice(record(value), 'view', NEW_WORKSPACE_VIEWS) }
}

export function readGetStarted(value: unknown): GetStartedResponse {
  const body = record(value, 'get started')
  return {
    orgId: maybeText(body, 'orgId'),
    steps: items(body, 'steps', (item) => {
      const step = record(item, 'step')
      return {
        step: choice(step, 'step', getStartedOrder),
        complete: flag(step, 'complete'),
      }
    }),
  }
}
