import {
  agentSessionsPath,
  agentSessionTranscriptPath,
  agentSessionMessagesPath,
  agentSessionPath,
  agentSessionPaths,
  agentMessagePath,
} from '../src/shared/agent-session-paths.ts'
import type {
  AgentCreateSessionRequest,
  AgentSendMessageRequest,
  AgentReadSessionRequest,
  AgentListSessionsRequest,
  AgentRenameSessionRequest,
  AgentCloseSessionRequest,
} from '../src/shared/agent-sessions.ts'
import {
  createSessionInput,
  sendSessionInput,
  readSessionInput,
  sessionWorkspace,
  text,
  ToolInputError,
} from './input.ts'
import { listSessionsInput } from './list-input.ts'
import { toolQuery } from './query.ts'
import {
  listedSessions,
  readSession,
  sessionResponse,
  stoppedSession,
  gotMessage,
} from './session-responses.ts'
import { createdSession, sentMessage } from './session-write-responses.ts'
import type { ToolReplyReader } from './transport.ts'

export function createSessionClient(read: ToolReplyReader) {
  return {
    listSessions(workspaceId?: string, input: AgentListSessionsRequest = {}) {
      return read(
        toolQuery(
          agentSessionsPath(sessionWorkspace(workspaceId)),
          listSessionsInput(input),
        ),
        listedSessions,
      )
    },
    readSession(
      sessionId: string,
      input: AgentReadSessionRequest = {},
      workspaceId?: string,
    ) {
      return read(
        toolQuery(
          agentSessionTranscriptPath(
            sessionWorkspace(workspaceId),
            text(sessionId),
          ),
          readSessionInput(input),
        ),
        readSession,
      )
    },
    createSession(input: AgentCreateSessionRequest = {}, workspaceId?: string) {
      const parsed = createSessionInput(input)
      return read(
        agentSessionsPath(sessionWorkspace(workspaceId)),
        createdSession,
        { ...parsed, requestId: parsed.requestId ?? crypto.randomUUID() },
      )
    },
    sendMessage(
      sessionId: string,
      input: AgentSendMessageRequest,
      workspaceId?: string,
    ) {
      const parsed = sendSessionInput(input)
      return read(
        agentSessionMessagesPath(
          sessionWorkspace(workspaceId),
          text(sessionId),
        ),
        sentMessage,
        { ...parsed, requestId: parsed.requestId ?? crypto.randomUUID() },
      )
    },
    getSession(sessionId: string, workspaceId?: string) {
      return read(
        agentSessionPath(sessionWorkspace(workspaceId), text(sessionId)),
        sessionResponse,
      )
    },
    renameSession(
      sessionId: string,
      input: AgentRenameSessionRequest,
      workspaceId?: string,
    ) {
      return read(
        agentSessionPaths.rename(
          sessionWorkspace(workspaceId),
          text(sessionId),
        ),
        sessionResponse,
        { title: text(input.title) },
      )
    },
    closeSession(
      sessionId: string,
      input: AgentCloseSessionRequest = {},
      workspaceId?: string,
    ) {
      if (
        input.stopRunningTurn !== undefined &&
        typeof input.stopRunningTurn !== 'boolean'
      )
        throw new ToolInputError('Choose whether to stop the running turn.')
      return read(
        agentSessionPaths.close(sessionWorkspace(workspaceId), text(sessionId)),
        sessionResponse,
        {
          ...(input.stopRunningTurn !== undefined && {
            stopRunningTurn: input.stopRunningTurn,
          }),
        },
      )
    },
    stopSession(sessionId: string, workspaceId?: string) {
      return read(
        agentSessionPaths.stop(sessionWorkspace(workspaceId), text(sessionId)),
        stoppedSession,
        {},
      )
    },
    getMessage(sessionId: string, messageId: string, workspaceId?: string) {
      return read(
        agentMessagePath(
          sessionWorkspace(workspaceId),
          text(sessionId),
          text(messageId),
        ),
        gotMessage,
      )
    },
  }
}
