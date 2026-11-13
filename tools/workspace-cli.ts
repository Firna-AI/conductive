import type { WorkspaceToolClient } from './client.ts'
import { cliFast, cliNumber, parseToolArguments } from './cli-options.ts'
import {
  createWorkspaceInput,
  sessionWorkspace,
  text,
  ToolInputError,
} from './input.ts'
import { listWorkspacesInput } from './list-input.ts'
import { cliMessage, type MessageInput } from './message-input.ts'

export async function runWorkspaceCommand(
  args: readonly string[],
  client: WorkspaceToolClient,
  input?: MessageInput,
) {
  const values = parseToolArguments(args)
  const workspaceId = sessionWorkspace(values.workspace)
  switch (args[1]) {
    case 'get':
      return client.getWorkspace(workspaceId)
    case 'rename':
      return client.renameWorkspace({ name: text(values.name) }, workspaceId)
    case 'move':
      return client.moveWorkspace(
        { sectionId: text(values.section) },
        workspaceId,
      )
    case 'archive':
      return client.archiveWorkspace(workspaceId)
    case 'list': {
      if (
        values.archived !== undefined &&
        values.archived !== 'true' &&
        values.archived !== 'false'
      )
        throw new ToolInputError(
          'Choose true or false for archived workspaces.',
        )
      return client.list(
        listWorkspacesInput({
          ownerId: values.owner,
          state: values.state,
          repositoryId: values.repository,
          query: values.query,
          updatedSince: cliNumber(values['updated-since']),
          ...(values.archived !== undefined && {
            archived: values.archived === 'true',
          }),
          limit: cliNumber(values.limit),
          offset: cliNumber(values.offset),
        }),
      )
    }
    case 'create':
      return client.create(
        createWorkspaceInput({
          repositoryId: values.repository,
          firstMessage: await cliMessage(values, input),
          name: values.name,
          firstSessionTitle: values['first-session-title'],
          startBranch: values['start-branch'],
          baseBranch: values['base-branch'],
          requestId: values['request-id'],
          ...((values.agent !== undefined || values.model !== undefined) && {
            model: { agent: values.agent, model: values.model },
          }),
          effort: values.effort,
          fast: cliFast(values.fast),
          sectionId: values.section,
        }),
      )
    default:
      throw new ToolInputError(
        'Use workspaces list, get, create, rename, move, or archive.',
      )
  }
}
