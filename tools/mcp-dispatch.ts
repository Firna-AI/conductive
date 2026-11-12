import { readDeviceCommandInput } from '../src/shared/device-read.ts'
import type { WorkspaceToolClient } from './client.ts'
import {
  createWorkspaceInput,
  createSessionInput,
  sendSessionInput,
  readSessionInput,
  sessionWorkspace,
  text,
  ToolInputError,
} from './input.ts'
import { listSessionsInput, listWorkspacesInput } from './list-input.ts'

export function dispatchMcpTool(
  client: WorkspaceToolClient,
  name: string,
  args: Record<string, unknown>,
) {
  const workspaceId = () => sessionWorkspace(args.workspaceId)
  const sessionId = () => text(args.sessionId)
  switch (name) {
    case 'run_mac_command':
      return client.runMacCommand(
        readDeviceCommandInput({
          ...args,
          requestId: args.requestId ?? crypto.randomUUID(),
        }),
      )
    case 'create_workspace':
      return client.create(createWorkspaceInput(args))
    case 'list_workspaces':
      return client.list(listWorkspacesInput(args))
    case 'get_workspace':
      return client.getWorkspace(workspaceId())
    case 'rename_workspace':
      return client.renameWorkspace({ name: text(args.name) }, workspaceId())
    case 'move_workspace':
      return client.moveWorkspace(
        { sectionId: text(args.sectionId) },
        workspaceId(),
      )
    case 'archive_workspace':
      return client.archiveWorkspace(workspaceId())
    case 'list_repositories':
      return client.listRepositories()
    case 'list_sections':
      return client.listSections()
    case 'list_models':
      return client.listModels()
    case 'list_sessions':
      return client.listSessions(workspaceId(), listSessionsInput(args))
    case 'get_session':
      return client.getSession(sessionId(), workspaceId())
    case 'read_session':
      return client.readSession(
        sessionId(),
        readSessionInput(args),
        workspaceId(),
      )
    case 'create_session':
      return client.createSession(createSessionInput(args), workspaceId())
    case 'send_message':
      return client.sendMessage(
        sessionId(),
        sendSessionInput(args),
        workspaceId(),
      )
    case 'rename_session':
      return client.renameSession(
        sessionId(),
        { title: text(args.title) },
        workspaceId(),
      )
    case 'close_session': {
      if (
        args.stopRunningTurn !== undefined &&
        typeof args.stopRunningTurn !== 'boolean'
      )
        throw new ToolInputError('Choose whether to stop the running turn.')
      return client.closeSession(
        sessionId(),
        {
          ...(args.stopRunningTurn !== undefined && {
            stopRunningTurn: args.stopRunningTurn,
          }),
        },
        workspaceId(),
      )
    }
    case 'stop_session':
      return client.stopSession(sessionId(), workspaceId())
    case 'get_message':
      return client.getMessage(sessionId(), text(args.messageId), workspaceId())
    case 'create_section':
      return client.createSection({ name: text(args.name) })
    case 'delete_section':
      return client.deleteSection(text(args.sectionId))
    case 'list_previews':
      return client.listPreviews(workspaceId())
    case 'open_preview': {
      if (typeof args.port !== 'number')
        throw new ToolInputError('Choose a port number for the preview.')
      return client.openPreview({ port: args.port }, workspaceId())
    }
    case 'close_preview':
      return client.closePreview(text(args.previewId), workspaceId())
    default:
      throw new ToolInputError('Unknown workspace tool.')
  }
}
