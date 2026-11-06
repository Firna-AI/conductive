import type { FakeApiServer } from '../../test-support/fake-api'
import { browserTargets, type FileActionTargets } from '../page/file-actions'
import { fetchedDownload, saveFromMemory } from '../page/fetched-download'

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
