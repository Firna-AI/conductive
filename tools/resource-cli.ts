import type { WorkspaceToolClient } from './client.ts'
import { parseToolArguments } from './cli-options.ts'
import { sessionWorkspace, text, ToolInputError } from './input.ts'

export function runResourceCli(
  args: readonly string[],
  client: WorkspaceToolClient,
) {
  const values = parseToolArguments(args)
  const workspaceId = sessionWorkspace(values.workspace)
  switch (`${args[0]} ${args[1]}`) {
    case 'messages get':
      return client.getMessage(
        text(values.session),
        text(values['message-id']),
        workspaceId,
      )
    case 'sections create':
      return client.createSection({ name: text(values.name) })
    case 'sections delete':
      return client.deleteSection(text(values.section))
    case 'previews list':
      return client.listPreviews(workspaceId)
    case 'previews open':
      return client.openPreview({ port: Number(values.port) }, workspaceId)
    case 'previews close':
      return client.closePreview(text(values.preview), workspaceId)
    case 'repositories list':
      return client.listRepositories()
    case 'sections list':
      return client.listSections()
    case 'models list':
      return client.listModels()
    default:
      throw new ToolInputError('Choose a command. Use --help for details.')
  }
}
