import type { AgentCreateWorkspaceRequest } from '../src/shared/agent-tools.ts'
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
  return {
    repositoryId: text(fields.repositoryId),
    firstMessage: text(fields.firstMessage),
    ...(model && {
      model: { agent: agent(model.agent), model: text(model.model) },
    }),
    ...(fields.effort !== undefined && { effort: effort(fields.effort) }),
    ...(fields.sectionId !== undefined && {
      sectionId: text(fields.sectionId),
    }),
  }
}
