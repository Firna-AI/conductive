import {
  AGENT_TRANSCRIPT_MAX_BYTES,
  type AgentReadSessionRequest,
  type AgentSessionSummary,
} from '../../src/shared/agent-tools'
import { sessionLink } from '../../src/shared/session-link'
import { jsonBytes } from '../../src/shared/event-limits'
import { AttachmentWorkspace } from '../chat/attachment-workspace'
import { buildSessionTranscript } from '../chat/session-transcript'
import { transcriptWindow } from '../chat/transcript-window'
import { featureResult } from '../features/result'
import type { ChatTransaction } from '../chat/store'
import type { Session } from '../../src/shared/sessions'
import { toolSessionWorkspace } from './session-access'
import { toolUser } from './composition-data'
import { findChatWorkspace } from '../chat/queries'
import { HttpError } from '../http'
import { activeStoredTurn } from '../devices/access'
import type { ToolSessionWrite } from './services'

async function sessionState(
  view: ChatTransaction,
  session: Session,
): Promise<AgentSessionSummary['state']> {
  const active = session.activeTurnId
    ? await view.turn(session.activeTurnId)
    : undefined
  if (active && ['queued', 'running', 'stopping'].includes(active.state))
    return 'running'
  const newest = await view.newestTurn(session.id)
  return newest && (await view.turn(newest))?.state === 'failed'
    ? 'failed'
    : 'idle'
}

/** Trusted calls still bind the exact object and scope each target to its org. */
export class AgentSessionWorkspace extends AttachmentWorkspace {
  async callingToolTurn(workspaceId: string, turnId: string) {
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.ctx.id))
      return null
    return this.chat.runLifecycle(async () => {
      const turn = await activeStoredTurn(this.chat, workspaceId, turnId)
      return turn
        ? {
            workspaceId,
            turnId,
            senderUserId: turn.senderId,
            sessionId: turn.sessionId,
          }
        : null
    })
  }

  writeAgentSession(input: ToolSessionWrite) {
    return featureResult(() =>
      this.chat.acceptToolWrite(input, async () => {
        const target = await toolSessionWorkspace(
          this.env.DB,
          input.orgId,
          input.workspaceId,
          this.env.APP_ORIGIN,
        )
        const workspace = await findChatWorkspace(
          this.env.DB,
          input.orgId,
          input.workspaceId,
        )
        if (!workspace)
          throw new HttpError(
            404,
            'workspace_not_found',
            'The workspace is not available.',
          )
        if (workspace.archivedAt !== null)
          throw new HttpError(
            409,
            'workspace_archived',
            'The archived chat is read-only.',
          )
        return {
          workspace: target,
          user: await toolUser(this.env.DB, input.orgId, input.senderUserId),
        }
      }),
    )
  }
  listAgentSessions(orgId: string, workspaceId: string, origin: string) {
    return featureResult(() =>
      this.chat.readWorkspace(workspaceId, async (view) => {
        const workspace = await toolSessionWorkspace(
          this.env.DB,
          orgId,
          workspaceId,
          origin,
        )
        const sessions = await view.sessions()
        sessions.sort(
          (a, b) =>
            a.createdAt - b.createdAt ||
            (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        )
        return {
          workspace,
          sessions: await Promise.all(
            sessions.map(async (session): Promise<AgentSessionSummary> => ({
              id: session.id,
              link: sessionLink(origin, orgId, workspaceId, session.id),
              title: session.title,
              choice: session.choice,
              startedBy: session.startedBy,
              closed: session.closedAt !== null,
              state: await sessionState(view, session),
            })),
          ),
        }
      }),
    )
  }

  readAgentSession(
    orgId: string,
    workspaceId: string,
    sessionId: string,
    input: AgentReadSessionRequest,
    origin: string,
  ) {
    return featureResult(async () => {
      const workspace = await this.chat.readWorkspace(workspaceId, () =>
        toolSessionWorkspace(this.env.DB, orgId, workspaceId, origin),
      )
      const detail = input.detail ?? 'concise'
      const { markdown } = await buildSessionTranscript(
        sessionId,
        detail,
        {
          workspaceId,
          orgId,
          number: workspace.number,
          origin,
        },
        this.chat.store,
        this.integration.storage,
        this.env,
      )
      const metadata = {
        workspace,
        session: {
          id: sessionId,
          link: sessionLink(origin, orgId, workspaceId, sessionId),
        },
        detail,
      }
      // The position fields need at most seven numbers with this many digits.
      const positionBytes = 256 + 7 * String(markdown.length + 1).length
      const budget =
        AGENT_TRANSCRIPT_MAX_BYTES - jsonBytes(metadata) - positionBytes
      return { ...metadata, ...transcriptWindow(markdown, input, budget) }
    })
  }
}
