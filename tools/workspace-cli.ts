import type { WorkspaceToolClient } from './client.ts'
import { cliNumber, parseToolArguments } from './cli-options.ts'
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
      for (const filter of ['archived', 'removed'] as const) {
        if (
          values[filter] !== undefined &&
          values[filter] !== 'true' &&
          values[filter] !== 'false'
        )
          throw new ToolInputError(
            `Choose true or false for ${filter} workspaces.`,
          )
      }
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
          ...(values.removed !== undefined && {
            removed: values.removed === 'true',
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
          requestId: values['request-id'],
          ...((values.agent !== undefined || values.model !== undefined) && {
            model: { agent: values.agent, model: values.model },
          }),
          effort: values.effort,
          sectionId: values.section,
        }),
      )
    default:
      throw new ToolInputError(
        'Use workspaces list, get, create, rename, move, or archive.',
      )
  }
}
