import type { CreateWorkspaceRequest } from '../../src/shared/workspaces'
import type { WorkspaceBranchChoice } from '../../src/shared/workspace-branches'
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
    effort !== 'max'
  )
    throw invalid()
  if (value.sectionId !== undefined && typeof value.sectionId !== 'string')
    throw invalid()
  return {
    repositoryId: value.repositoryId,
    sectionId: value.sectionId,
    ...(value.branch === undefined
      ? {}
      : { branch: branchChoice(value.branch) }),
    firstMessage: {
      id: message.id,
      text: message.text,
      attachmentIds,
      choice: { agent: choice.agent, model: choice.model, effort },
    },
  }
}

function branchChoice(value: unknown): WorkspaceBranchChoice {
  if (!isRecord(value)) throw invalid()
  if (value.type === 'new') return { type: 'new' }
  if (value.type === 'existing' && typeof value.name === 'string')
    return { type: 'existing', name: value.name }
  throw invalid()
}

function invalid(): HttpError {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}
