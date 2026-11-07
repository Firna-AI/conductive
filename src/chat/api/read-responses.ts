import type { AgentLoginStatus } from '../../shared/account'
import type { AgentChoice, AgentModel } from '../../shared/agents'
import type { Org, User } from '../../shared/api'
import type { Attachment, SendMessageResponse } from '../../shared/messages'
import type {
  ChangeModelResponse,
  InterruptResponse,
  Session,
  SessionsResponse,
} from '../../shared/sessions'
import type { WorkspaceTab, WorkspaceView } from '../../shared/workspace-view'
import { flag, list, nullable, oneOf, record, text } from './json'
import {
  readAgent,
  readAttachment,
  readChoice,
  readDraft,
  readEffort,
  readSession,
  readUserMessage,
} from './read-chat'

/** What the composer needs to know about the agent logins of the user. */
export type AgentLogin = Pick<AgentLoginStatus, 'agent' | 'connected'>

export interface AccountSummary {
  /** The signed-in user, who reads the chat. */
  user: Pick<User, 'id'>
  defaultChoice: AgentChoice
  agentLogins: readonly AgentLogin[]
}

/** A member of the org, with what the chat needs to name them. */
export type MemberSummary = Pick<User, 'id' | 'githubLogin' | 'displayName'>

/** What the chat needs to know about the org: its name. */
export type OrgSummary = Pick<Org, 'name'>

export function readSessions(value: unknown): SessionsResponse {
  const source = record(value, 'sessions')
  return {
    sessions: list(readSession)(source.sessions),
    history: list(readSession)(source.history),
  }
}

export function readSessionResponse(value: unknown): Session {
  return readSession(record(value, 'session response').session)
}

export function readSendResponse(value: unknown): SendMessageResponse {
  const source = record(value, 'send response')
  return {
    message: readUserMessage(source.message),
    turnId: nullable(text)(source.turnId),
  }
}

export function readChangeModel(value: unknown): ChangeModelResponse {
  const source = record(value, 'model response')
  return {
    session: readSession(source.session),
    created: flag(source.created),
    draft: readDraft(source.draft),
  }
}

export function readInterrupt(value: unknown): InterruptResponse {
  const source = record(value, 'interrupt response')
  return {
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
      efforts: list(readEffort)(source.efforts),
    }
  })(record(value, 'models').models)
}

export function readAccount(value: unknown): AccountSummary {
  const source = record(value, 'account')
  return {
    user: { id: text(record(source.user, 'user').id) },
    defaultChoice: readChoice(source.defaultChoice),
    agentLogins: list((item): AgentLogin => {
      const login = record(item, 'agent login')
      return { agent: readAgent(login.agent), connected: flag(login.connected) }
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

function readTab(value: unknown): WorkspaceTab {
  const source = record(value, 'tab')
  switch (source.kind) {
    case 'session':
      return { kind: 'session', sessionId: text(source.sessionId) }
    case 'diff':
      return { kind: 'diff', path: text(source.path) }
    default:
      return {
        kind: oneOf({ file: true })(source.kind),
        path: text(source.path),
        mode: oneOf({ preview: true, source: true })(source.mode),
      }
  }
}

export function readView(value: unknown): WorkspaceView {
  const view = record(record(value, 'view response').view, 'view')
  return {
    tabs: list(readTab)(view.tabs),
    activeTab: nullable(readTab)(view.activeTab),
    fileList: oneOf({ all: true, changes: true, checks: true })(view.fileList),
    tool: oneOf({ terminal: true, preview: true, desktop: true })(view.tool),
  }
}

export function readAttachmentResponse(value: unknown): Attachment {
  return readAttachment(record(value, 'attachment response').attachment)
}
