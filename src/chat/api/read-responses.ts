import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { AgentLoginStatus, EndpointModelList } from '../../shared/account'
import type { DefaultLoginEntry } from '../../app/default-logins'

import type { Org, User } from '../../shared/api'
import type { SendMessageResponse } from '../../shared/messages'
import type {
  ChangeModelResponse,
  InterruptResponse,
  SessionResponse,
  SessionsResponse,
  SessionTranscriptResponse,
} from '../../shared/sessions'
import {
  count,
  flag,
  list,
  nullable,
  oneOf,
  optional,
  record,
  text,
} from './json'
import {
  readAgent,
  readChoice,
  readDraft,
  readEffort,
  readSession,
  readSessionLogin,
  readUserMessage,
} from './read-chat'

/**
 * The composer's login status, its unavailable cause, and the endpoint
 * model list that the owner's picker follows.
 */
type AgentLogin = Pick<AgentLoginStatus, 'agent' | 'connected'> & {
  modelList?: EndpointModelList
  unusableCause?: string
}

export interface AccountSummary {
  /** The signed-in user, who reads the chat. */
  user: Pick<User, 'id'>
  defaultChoice: AgentChoice
  /** The model favourites of the reader, in the order of the model menu. */
  favourites: readonly AgentChoice[]
  agentLogins: readonly AgentLogin[]
  /**
   * The login that a new session of the reader takes, for each org and
   * agent, as the server names it. An older reply names none.
   */
  defaultLogins?: readonly DefaultLoginEntry[]
}

/** A member of the org, with what the chat needs to name them. */
export type MemberSummary = Pick<User, 'id' | 'githubLogin' | 'displayName'>

/** What the chat needs to know about the org: its name. */
export type OrgSummary = Pick<Org, 'name'>

/** The session lists, with the event number whose state they hold. */
export function readSessions(value: unknown): SessionsResponse {
  const source = record(value, 'sessions')
  return {
    eventNumber: count(source.eventNumber),
    sessions: list(readSession)(source.sessions),
    history: list(readSession)(source.history),
  }
}

/** A session record of a reply, with the event number whose state it holds. */
export function readSessionResponse(value: unknown): SessionResponse {
  const source = record(value, 'session response')
  return {
    eventNumber: count(source.eventNumber),
    session: readSession(source.session),
  }
}

export function readSendResponse(value: unknown): SendMessageResponse {
  const source = record(value, 'send response')
  return {
    eventNumber: count(source.eventNumber),
    message: readUserMessage(source.message),
    turnId: nullable(text)(source.turnId),
    session: readSession(source.session),
  }
}

export function readChangeModel(value: unknown): ChangeModelResponse {
  const source = record(value, 'model response')
  return {
    ...readSessionResponse(value),
    created: flag(source.created),
    draft: readDraft(source.draft),
  }
}

export function readInterrupt(value: unknown): InterruptResponse {
  const source = record(value, 'interrupt response')
  return {
    eventNumber: count(source.eventNumber),
    turnId: text(source.turnId),
    state: oneOf({ stopping: true, stopped: true })(source.state),
  }
}

export function readModels(value: unknown): readonly AgentModel[] {
  return list((item): AgentModel => {
    const source = record(item, 'model')
    return {
      agent: readAgent(source.agent),
      model: text(source.model),
      label: text(source.label),
      ...(typeof source.fast === 'boolean' && { fast: source.fast }),
      efforts: list(readEffort)(source.efforts),
    }
  })(record(value, 'models').models)
}

function readModelList(value: unknown): EndpointModelList {
  const source = record(value, 'model list')
  return {
    missing: list(text)(source.missing),
    checkedAt: count(source.checkedAt),
  }
}

/** The default login of the reader for one org and one agent. */
function readDefaultLogin(value: unknown): DefaultLoginEntry {
  const source = record(value, 'default login')
  const orgModelList = optional(nullable(readModelList))(source.orgModelList)
  return {
    orgId: text(source.orgId),
    orgName: text(source.orgName),
    agent: readAgent(source.agent),
    login: optional(nullable(readSessionLogin))(source.login) ?? null,
    ...(orgModelList ? { orgModelList } : {}),
  }
}

/**
 * The account of the reader. An older reply without favourites reads as an
 * account with none, as the reader of the app reads it.
 */
export function readAccount(value: unknown): AccountSummary {
  const source = record(value, 'account')
  const defaultLogins = optional(list(readDefaultLogin))(source.defaultLogins)
  return {
    user: { id: text(record(source.user, 'user').id) },
    defaultChoice: readChoice(source.defaultChoice),
    favourites: optional(list(readChoice))(source.favourites) ?? [],
    ...(defaultLogins ? { defaultLogins } : {}),
    agentLogins: list((item): AgentLogin => {
      const login = record(item, 'agent login')
      const modelList = optional(readModelList)(login.modelList)
      return {
        agent: readAgent(login.agent),
        connected: flag(login.connected),
        ...(modelList ? { modelList } : {}),
        ...(login.unusableCause === undefined
          ? {}
          : { unusableCause: text(login.unusableCause) }),
      }
    })(source.agentLogins),
  }
}

export function readMembers(value: unknown): readonly MemberSummary[] {
  return list((item): MemberSummary => {
    const user = record(record(item, 'member').user, 'user')
    return {
      id: text(user.id),
      githubLogin: text(user.githubLogin),
      displayName: nullable(text)(user.displayName),
    }
  })(record(value, 'members').members)
}

export function readOrg(value: unknown): OrgSummary {
  const org = record(record(value, 'org response').org, 'org')
  return { name: text(org.name) }
}

/** The Markdown of a session, for its pending clipboard write. */
export function readTranscript(value: unknown): SessionTranscriptResponse {
  return { markdown: text(record(value, 'session transcript').markdown) }
}
