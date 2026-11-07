import { ACCOUNT_PATHS } from '../../shared/account'
import { MODELS_PATH, type AgentChoice } from '../../shared/agents'
import { boatKeyPath, orgPath, type EmptyRequest } from '../../shared/api'
import { chatHistoryPath } from '../../shared/events'
import { filePaths } from '../../shared/files'
import { membersPath } from '../../shared/members'
import type {
  SendMessageRequest,
  UploadAttachmentRequest,
} from '../../shared/messages'
import {
  retryMessagePath,
  sessionPath,
  sessionPaths,
  sessionsPath,
  type ChangeModelRequest,
  type CloseSessionRequest,
  type CreateSessionRequest,
  type InterruptRequest,
  type RenameSessionRequest,
} from '../../shared/sessions'
import {
  workspaceViewPath,
  type UpdateWorkspaceViewRequest,
} from '../../shared/workspace-view'
import { workspacePath, workspacePaths } from '../../shared/workspaces'
import { isRecord, type Reader } from './json'
import {
  readAccount,
  readAttachmentResponse,
  readBoatKey,
  readChangeModel,
  readInterrupt,
  readMembers,
  readModels,
  readOrg,
  readSendResponse,
  readSessionResponse,
  readSessions,
  readView,
} from './read-responses'
import { readStoredEvents, readWorkspaceResponse } from './read-workspace'

/** The browser's `fetch`, or a fake with the same shape. */
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export interface WorkspaceTarget {
  orgId: string
  workspaceId: string
}

/** A failed request, with the Worker's error code and its product message. */
export class ChatApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ChatApiError'
    this.status = status
    this.code = code
  }
}

const RETRY_MESSAGE = 'The request failed. Try again.'
const empty: EmptyRequest = {}

async function readBody(response: Response): Promise<unknown> {
  const body = await response.text()
  if (body === '') return null
  try {
    const value: unknown = JSON.parse(body)
    return value
  } catch {
    return null
  }
}

function failure(status: number, body: unknown): ChatApiError {
  const error = isRecord(body) ? body.error : null
  if (
    isRecord(error) &&
    typeof error.code === 'string' &&
    typeof error.message === 'string'
  ) {
    return new ChatApiError(status, error.code, error.message)
  }
  return new ChatApiError(status, 'request_failed', RETRY_MESSAGE)
}

export type JsonMethod = 'GET' | 'POST' | 'PUT' | 'PATCH'

/**
 * One JSON call of the API. A failure throws `ChatApiError` with the
 * Worker's code and message, and a body that `read` refuses throws a
 * retryable error.
 */
export async function requestJson<T>(
  fetch: FetchLike,
  method: JsonMethod,
  path: string,
  read: Reader<T>,
  body?: object,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ChatApiError(0, 'network_error', RETRY_MESSAGE)
  }
  const value = await readBody(response)
  if (!response.ok) throw failure(response.status, value)
  try {
    return read(value)
  } catch {
    throw new ChatApiError(
      response.status,
      'unreadable_response',
      RETRY_MESSAGE,
    )
  }
}

/** The chat routes of one workspace, through the shared route builders. */
export function createChatApi(fetch: FetchLike, target: WorkspaceTarget) {
  const { orgId, workspaceId } = target
  const call = <T>(
    method: JsonMethod,
    path: string,
    read: Reader<T>,
    body?: object,
  ): Promise<T> => requestJson(fetch, method, path, read, body)

  const session = (id: string) => sessionPath(orgId, workspaceId, id)
  const routes = (id: string) => ({
    close: sessionPaths.close(orgId, workspaceId, id),
    reopen: sessionPaths.reopen(orgId, workspaceId, id),
    messages: sessionPaths.messages(orgId, workspaceId, id),
    interrupt: sessionPaths.interrupt(orgId, workspaceId, id),
    model: sessionPaths.model(orgId, workspaceId, id),
  })

  return {
    workspace: () =>
      call('GET', workspacePath(orgId, workspaceId), readWorkspaceResponse),
    resume: () =>
      call(
        'POST',
        workspacePaths.resume(orgId, workspaceId),
        readWorkspaceResponse,
        empty,
      ),
    sessions: () => call('GET', sessionsPath(orgId, workspaceId), readSessions),
    /** The full stored history of one session. */
    history: (sessionId: string) =>
      call(
        'GET',
        chatHistoryPath(orgId, workspaceId, sessionId),
        readStoredEvents,
      ),
    view: () => call('GET', workspaceViewPath(orgId, workspaceId), readView),
    saveView: (view: UpdateWorkspaceViewRequest) =>
      call('PUT', workspaceViewPath(orgId, workspaceId), readView, view),
    models: () => call('GET', MODELS_PATH, readModels),
    account: () => call('GET', ACCOUNT_PATHS.account, readAccount),
    org: () => call('GET', orgPath(orgId), readOrg),
    /** The members of the org, so the chat names the member who pressed Stop. */
    members: () => call('GET', membersPath(orgId), readMembers),
    boatKey: () => call('GET', boatKeyPath(orgId), readBoatKey),
    createSession: (choice: AgentChoice) =>
      call('POST', sessionsPath(orgId, workspaceId), readSessionResponse, {
        choice,
      } satisfies CreateSessionRequest),
    renameSession: (id: string, title: string) =>
      call('PATCH', session(id), readSessionResponse, {
        title,
      } satisfies RenameSessionRequest),
    closeSession: (id: string, stopRunningTurn: boolean) =>
      call('POST', routes(id).close, readSessionResponse, {
        stopRunningTurn,
      } satisfies CloseSessionRequest),
    reopenSession: (id: string) =>
      call('POST', routes(id).reopen, readSessionResponse, empty),
    send: (id: string, request: SendMessageRequest) =>
      call('POST', routes(id).messages, readSendResponse, request),
    retry: (id: string, messageId: string) =>
      call(
        'POST',
        retryMessagePath(orgId, workspaceId, id, messageId),
        readSendResponse,
        empty,
      ),
    interrupt: (id: string, turnId: string) =>
      call('POST', routes(id).interrupt, readInterrupt, {
        turnId,
      } satisfies InterruptRequest),
    changeModel: (id: string, request: ChangeModelRequest) =>
      call('PUT', routes(id).model, readChangeModel, request),
    attach: (request: UploadAttachmentRequest) =>
      call(
        'POST',
        filePaths.attachments(orgId, workspaceId),
        readAttachmentResponse,
        request,
      ),
  }
}

export type ChatApi = ReturnType<typeof createChatApi>
