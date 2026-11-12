import { createMacCommandClient } from './device-client.ts'
import { createResourceClient } from './resource-client.ts'
import { createSessionClient } from './session-client.ts'
import {
  createToolReplyReader,
  type WorkspaceToolConfiguration,
} from './transport.ts'
import { createWorkspaceClient } from './workspace-client.ts'

export type WorkspaceToolClient = ReturnType<typeof createWorkspaceToolClient>

export function createWorkspaceToolClient(
  configuration: WorkspaceToolConfiguration,
  send: (request: Request) => Promise<Response> = fetch,
) {
  const read = createToolReplyReader(configuration, send)
  return {
    ...createWorkspaceClient(read),
    ...createSessionClient(read),
    ...createResourceClient(read),
    runMacCommand: createMacCommandClient(configuration, read),
  }
}
