import type {
  AgentCreateSessionRequest,
  AgentSendMessageRequest,
  AgentReadSessionRequest,
} from '../src/shared/agent-sessions.ts'
import type { AgentCreateWorkspaceRequest } from '../src/shared/agent-workspaces.ts'
import type { Agent, AgentChoice, Effort } from '../src/shared/agents.ts'

export const TOOL_AGENTS = [
  'claude',
  'codex',
] as const satisfies readonly Agent[]
export const TOOL_EFFORTS = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultra',
] as const satisfies readonly Effort[]

export class ToolInputError extends Error {}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ToolInputError('Use an object for the workspace request.')
  }
  return value
}

export function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ToolInputError('Complete the required workspace fields.')
  }
  return value
}

export function agent(value: unknown): Agent {
  if (value === 'claude' || value === 'codex') return value
  throw new ToolInputError('Choose Claude or Codex for the workspace.')
}

export function effort(value: unknown): Effort {
  switch (value) {
    case 'none':
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
    case 'max':
    case 'ultra':
      return value
    default:
      throw new ToolInputError('Choose a valid effort for the workspace.')
  }
}

export function choice(value: unknown): AgentChoice {
  const fields = record(value)
  return {
    agent: agent(fields.agent),
    model: text(fields.model),
    effort: effort(fields.effort),
  }
}

export function createWorkspaceInput(
  value: unknown,
): AgentCreateWorkspaceRequest {
  const fields = record(value)
  const model = fields.model === undefined ? undefined : record(fields.model)
  if (
    fields.requestId !== undefined &&
    (typeof fields.requestId !== 'string' || fields.requestId.length === 0)
  )
    throw new ToolInputError('Use a nonempty request ID.')
  return {
    ...(typeof fields.requestId === 'string' && {
      requestId: fields.requestId,
    }),
    ...(typeof fields.firstSessionTitle === 'string' && {
      firstSessionTitle: fields.firstSessionTitle,
    }),
    repositoryId: text(fields.repositoryId),
    firstMessage: text(fields.firstMessage),
    ...(typeof fields.name === 'string' && { name: fields.name }),
    ...(model && {
      model: { agent: agent(model.agent), model: text(model.model) },
    }),
    ...(fields.effort !== undefined && { effort: effort(fields.effort) }),
    ...(fields.sectionId !== undefined && {
      sectionId: text(fields.sectionId),
    }),
  }
}

export function sessionWorkspace(value: unknown): string | undefined {
  return value === undefined ? undefined : text(value)
}

function counter(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    return value
  throw new ToolInputError('Use a whole, nonnegative transcript position.')
}

export function readSessionInput(value: unknown): AgentReadSessionRequest {
  const fields = record(value)
  const detail = fields.detail
  if (detail !== undefined && detail !== 'concise' && detail !== 'full')
    throw new ToolInputError('Choose concise or full transcript detail.')
  return {
    ...(detail !== undefined && { detail }),
    ...(fields.startLine !== undefined && {
      startLine: counter(fields.startLine),
    }),
    ...(fields.startOffset !== undefined && {
      startOffset: counter(fields.startOffset),
    }),
  }
}

function sessionChoice(
  fields: Record<string, unknown>,
): Pick<AgentCreateSessionRequest, 'model' | 'effort' | 'requestId'> {
  const model = fields.model === undefined ? undefined : record(fields.model)
  if (
    fields.requestId !== undefined &&
    (typeof fields.requestId !== 'string' || fields.requestId.length === 0)
  )
    throw new ToolInputError('Use a nonempty request ID.')
  return {
    ...(model && {
      model: { agent: agent(model.agent), model: text(model.model) },
    }),
    ...(fields.effort !== undefined && { effort: effort(fields.effort) }),
    ...(typeof fields.requestId === 'string' && {
      requestId: fields.requestId,
    }),
  }
}

export function createSessionInput(value: unknown): AgentCreateSessionRequest {
  const fields = record(value)
  return {
    ...sessionChoice(fields),
    ...(typeof fields.title === 'string' && { title: fields.title }),
    ...(fields.firstMessage !== undefined && {
      firstMessage: text(fields.firstMessage),
    }),
  }
}

export function sendSessionInput(value: unknown): AgentSendMessageRequest {
  const fields = record(value)
  return { ...sessionChoice(fields), text: text(fields.text) }
}
