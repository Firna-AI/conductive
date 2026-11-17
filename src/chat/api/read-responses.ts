import type { AgentModel } from '../../shared/generated/AgentModel'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { AgentLoginStatus, EndpointModelList } from '../../shared/account'

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
  isTabPort,
  type TemporaryTab,
  type WorkspaceTab,
  type WorkspaceView,
  type WorkspaceViewResponse,
} from '../../shared/workspace-view'
import {
  viewFromWire,
  type PreviewTabPlace,
} from '../../shared/workspace-view-wire'
import {
  count,
  flag,
  isRecord,
  list,
  nullable,
  oneOf,
  optional,
  record,
  text,
  UnreadableResponse,
} from './json'
import {
  readAgent,
  readChoice,
  readDraft,
  readEffort,
  readSession,
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
  agentLogins: readonly AgentLogin[]
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

export function readAccount(value: unknown): AccountSummary {
  const source = record(value, 'account')
  return {
    user: { id: text(record(source.user, 'user').id) },
    defaultChoice: readChoice(source.defaultChoice),
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

function readTab(value: unknown): WorkspaceTab {
  const source = record(value, 'tab')
  switch (source.kind) {
    case 'session':
      return { kind: 'session', sessionId: text(source.sessionId) }
    case 'diff':
      return { kind: 'diff', path: text(source.path) }
    case 'preview':
      if (!isTabPort(source.port)) throw new UnreadableResponse('port')
      return { kind: 'preview', port: source.port }
    default:
      return {
        kind: oneOf({ file: true })(source.kind),
        path: text(source.path),
        mode: oneOf({ preview: true, source: true })(source.mode),
      }
  }
}

function readTemporaryTab(
  value: unknown,
  tabs: readonly WorkspaceTab[],
): TemporaryTab | null {
  if (
    !isRecord(value) ||
    (value.kind !== 'file' && value.kind !== 'diff') ||
    typeof value.path !== 'string' ||
    !value.path
  )
    return null
  return tabs.some(
    (tab) =>
      (tab.kind === 'file' || tab.kind === 'diff') &&
      tab.kind === value.kind &&
      tab.path === value.path,
  )
    ? { kind: value.kind, path: value.path }
    : null
}

/** A Preview tab of the route: its port and its place in the row. */
function readPreviewPlace(value: unknown): PreviewTabPlace {
  const place = record(value, 'preview tab')
  if (!isTabPort(place.port)) throw new UnreadableResponse('port')
  return { port: place.port, place: count(place.place) }
}

/**
 * The saved view from the shape of the route, as `WorkspaceViewWire` says:
 * the tabs, with each Preview tab at its place in the row.
 */
export function readView(value: unknown): WorkspaceView {
  const view = record(record(value, 'view response').view, 'view')
  const tabs = list(readTab)(view.tabs)
  const activePreview = optional(nullable(count))(view.activePreview) ?? null
  if (activePreview !== null && !isTabPort(activePreview)) {
    throw new UnreadableResponse('port')
  }
  return viewFromWire(
    {
      tabs,
      activeTab: nullable(readTab)(view.activeTab),
      temporaryTab: readTemporaryTab(view.temporaryTab, tabs),
      fileList: oneOf({ all: true, changes: true, checks: true })(
        view.fileList,
      ),
      tool: oneOf({ terminal: true, preview: true, desktop: true })(view.tool),
    },
    optional(list(readPreviewPlace))(view.previewTabs) ?? [],
    activePreview,
  )
}

/**
 * The automation whose run made the workspace, with the pull request of a
 * pull request run, or null for a run of a schedule or of Run now.
 */
export type RunAutomation = Required<
  NonNullable<WorkspaceViewResponse['automation']>
>

/** The saved view, and the automation of a run workspace. */
export interface ViewReply {
  view: WorkspaceView
  /** Null for a workspace that a person created. */
  automation: RunAutomation | null
  /**
   * The absolute folder of the workspace repository, or null when the
   * reply gives none or gives a folder that is not absolute.
   */
  repositoryFolder: string | null
}

function readPullRequest(value: unknown): RunAutomation['pullRequest'] {
  const pullRequest = record(value, 'pull request')
  return { number: count(pullRequest.number), url: text(pullRequest.url) }
}

function readRunAutomation(value: unknown): RunAutomation {
  const automation = record(value, 'automation')
  const pullRequest = optional(nullable(readPullRequest))(
    automation.pullRequest,
  )
  return {
    id: text(automation.id),
    name: text(automation.name),
    pullRequest: pullRequest ?? null,
  }
}

/** A folder of the cloud computer: an absolute path without a last `/`. */
function readFolder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return /^\/[^\r\n]*[^/\r\n]$/u.test(value) ? value : null
}

export function readViewReply(value: unknown): ViewReply {
  const reply = record(value, 'view response')
  return {
    view: readView(value),
    automation: optional(nullable(readRunAutomation))(reply.automation) ?? null,
    repositoryFolder: readFolder(reply.repositoryFolder),
  }
}

/** The Markdown of a session, for its pending clipboard write. */
export function readTranscript(value: unknown): SessionTranscriptResponse {
  return { markdown: text(record(value, 'session transcript').markdown) }
}
