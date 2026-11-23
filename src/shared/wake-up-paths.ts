import { agentSessionPath } from './agent-session-paths'
import { MACHINE_PATHS } from './agent-tools'
import { sessionPath } from './sessions'

const listFrom = (session: string) => `${session}/wake-ups`
const cancelFrom = (session: string, id: string) =>
  `${listFrom(session)}/${encodeURIComponent(id)}/cancel`

/** @public Routes used by the workspace tools. */
export const agentWakeUpPaths = {
  schedule: MACHINE_PATHS.wakeUps,
  list: (workspaceId: string | undefined, sessionId: string) =>
    listFrom(agentSessionPath(workspaceId, sessionId)),
  cancel: (workspaceId: string | undefined, sessionId: string, id: string) =>
    cancelFrom(agentSessionPath(workspaceId, sessionId), id),
}

/** @public Routes used by the chat. */
export const sessionWakeUpPaths = {
  list: (orgId: string, workspaceId: string, sessionId: string) =>
    listFrom(sessionPath(orgId, workspaceId, sessionId)),
  cancel: (orgId: string, workspaceId: string, sessionId: string, id: string) =>
    cancelFrom(sessionPath(orgId, workspaceId, sessionId), id),
}
