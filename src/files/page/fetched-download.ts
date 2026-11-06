import type { FetchLike } from '../api/files-client'
import { splitPath } from '../navigation'
import type { FileActionTargets } from './file-actions'

/** Saves a file that is in memory under its name. */
export type SaveFile = (file: Blob, name: string) => void

/**
 * A Download that reads the route through an injected fetch, then saves
 * the file from memory. The development page and the tests use it, because
 * their fake API serves no route that the browser can read. The product
 * uses the download of `browserTargets`, which streams the file.
 */
export function fetchedDownload(
  fetch: FetchLike,
  save: SaveFile,
): FileActionTargets['download'] {
  return async (client, path) => {
    const response = await fetch(client.downloadHref(path))
    if (!response.ok) return false
    save(await response.blob(), splitPath(path).name)
    return true
  }
}
