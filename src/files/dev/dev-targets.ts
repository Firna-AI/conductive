import type { FakeApiServer } from '../../test-support/fake-api'
import { browserTargets, type FileActionTargets } from '../page/file-actions'
import { fetchedDownload } from '../page/fetched-download'

/** How long the browser keeps the address of a saved file, in ms. */
const keepAddressMs = 60_000

/** Saves a file from memory as a browser download. Development only. */
function saveFromMemory(file: Blob, name: string): void {
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
 * Copy and Download of the development page. Download reads the fake API,
 * because no route serves the files there. Create it once and keep it.
 */
export function devTargets(server: FakeApiServer): FileActionTargets {
  return {
    writeText: (text) => browserTargets.writeText(text),
    download: fetchedDownload(server.fetch, saveFromMemory),
  }
}
