import { versionOf, type WorkspaceFiles } from './files-store'
import type { ResourceLoader } from './resource-loader'

/**
 * Reads one path now, and again each time an event may change its file or
 * its diff. Returns the function that stops it.
 */
export function followPath<T>(
  files: WorkspaceFiles,
  loader: ResourceLoader<T>,
  path: string,
): () => void {
  const update = () =>
    loader.request(path, versionOf(files.getSnapshot(), path))
  update()
  const unsubscribe = files.subscribe(update)
  return () => {
    unsubscribe()
    loader.cancel()
  }
}
