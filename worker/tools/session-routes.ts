import {
  MACHINE_PATHS,
  type AgentReadSessionRequest,
} from '../../src/shared/agent-tools'
import { HttpError } from '../http'
import { counter, invalidInput } from '../chat/inputs'
import type { AgentToolServices } from './services'
import type { CallingWorkspace } from './store'
import { toolSessionWorkspace } from './session-access'

const SESSION_ROUTE = new RegExp(
  `^${MACHINE_PATHS.workspaces}/([^/]+)/sessions(?:/([^/]+)/transcript)?$`,
)

export function isAgentSessionPath(path: string): boolean {
  return SESSION_ROUTE.test(path)
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}

function readOptions(query: URLSearchParams): AgentReadSessionRequest {
  const detail = query.get('detail') ?? 'concise'
  if (detail !== 'concise' && detail !== 'full') return invalidInput()
  const start = query.get('startLine')
  const offset = query.get('startOffset')
  return {
    detail,
    ...(start !== null && { startLine: Math.max(1, counter(Number(start))) }),
    ...(offset !== null && { startOffset: counter(Number(offset)) }),
  }
}

export async function readSessionsFromTool(
  url: URL,
  db: D1Database,
  caller: CallingWorkspace,
  origin: string,
  services: AgentToolServices,
) {
  const match = url.pathname.match(SESSION_ROUTE)
  if (!match) return null
  const workspaceId =
    match[1] === 'current' ? caller.workspaceId : decode(match[1])
  await toolSessionWorkspace(db, caller.orgId, workspaceId, origin)
  return match[2] === undefined
    ? services.listSessions(caller.orgId, workspaceId)
    : services.readSession(
        caller.orgId,
        workspaceId,
        decode(match[2]),
        readOptions(url.searchParams),
      )
}
