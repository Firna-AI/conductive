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

/** The parts that keep each store connected now, such as Files and the chat. */
const connections = new WeakMap<WorkspaceFiles, number>()

/**
 * Starts the files: the first reads and the stream. The result stops them.
 * Several parts can connect the same store, such as the Files part and the
 * chat. They share one connection, which stops when the last part stops.
 */
export function startFiles(files: WorkspaceFiles): () => void {
  const count = connections.get(files) ?? 0
  connections.set(files, count + 1)
  if (count === 0) files.start()
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    const left = (connections.get(files) ?? 1) - 1
    connections.set(files, left)
    if (left === 0) files.stop()
  }
}
