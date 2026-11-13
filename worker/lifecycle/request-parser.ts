import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import { HttpError, isRecord } from '../http'

export function createWorkspaceInput(value: unknown): CreateWorkspaceRequest {
  if (
    !isRecord(value) ||
    typeof value.repositoryId !== 'string' ||
    !isRecord(value.firstMessage)
  )
    throw invalid()
  const message = value.firstMessage
  const choice = message.choice
  if (
    typeof message.id !== 'string' ||
    typeof message.text !== 'string' ||
    !Array.isArray(message.attachmentIds) ||
    !isRecord(choice)
  )
    throw invalid()
  const attachmentIds = message.attachmentIds.map((id: unknown) => {
    if (typeof id !== 'string') throw invalid()
    return id
  })
  if (
    typeof choice.model !== 'string' ||
    (choice.agent !== 'claude' && choice.agent !== 'codex')
  )
    throw invalid()
  const effort = choice.effort
  if (
    effort !== 'none' &&
    effort !== 'low' &&
    effort !== 'medium' &&
    effort !== 'high' &&
    effort !== 'xhigh' &&
    effort !== 'max' &&
    effort !== 'ultra'
  )
    throw invalid()
  if (value.sectionId !== undefined && typeof value.sectionId !== 'string')
    throw invalid()
  return {
    repositoryId: value.repositoryId,
    sectionId: value.sectionId,
    firstMessage: {
      id: message.id,
      text: message.text,
      attachmentIds,
      choice: { agent: choice.agent, model: choice.model, effort },
    },
  }
}

function invalid(): HttpError {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}
