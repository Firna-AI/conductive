import type { FetchLike } from '../api/files-client'
import { splitPath } from '../navigation'
import type { FileActionTargets } from './file-actions'

/** Saves a file that is in memory under its name. */
export type SaveFile = (file: Blob, name: string) => void

/** How long the browser keeps the address of a saved file, in ms. */
const keepAddressMs = 60_000

/**
 * Saves a file from memory as a browser download. The address of the file
 * stays long enough for the browser to start the download, then it goes.
 */
export const saveFromMemory: SaveFile = (file, name) => {
  const address = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = address
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(address), keepAddressMs)
}

/**
 * A Download that reads the download route through a fetch, then saves the
 * file from memory. It saves nothing when the route refuses the file, as
 * for a file over the read limit, a removed file, or a sleeping sandbox.
 * `browserTargets` passes the fetch of the browser. The development page
 * and the tests pass the fetch of the fake API, which serves no route that
 * the browser can read.
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
