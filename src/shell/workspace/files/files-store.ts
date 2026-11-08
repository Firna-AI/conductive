import { replaySubscribe } from '../../../app/replay-socket'
import type { AppServices } from '../../../app/services'
import type { WorkspaceIdentity } from '../../../app/workspace-store'
import { createFilesClient } from '../../../files/api/files-client'
import { WorkspaceFiles } from '../../../files/model/files-store'

/**
 * The files of one workspace over the transport of the app: its fetch for
 * the file routes, and its event source, after an event number, for the
 * stream. It starts nothing.
 */
export function createWorkspaceFiles(
  services: AppServices,
  workspace: WorkspaceIdentity,
): WorkspaceFiles {
  return new WorkspaceFiles({
    client: createFilesClient({ fetch: services.api.fetch, ...workspace }),
    subscribe: replaySubscribe(services.events, workspace, services.delay),
  })
}

/** Starts the files: the first reads and the stream. The result stops them. */
export function startFiles(files: WorkspaceFiles): () => void {
  files.start()
  return () => files.stop()
}
