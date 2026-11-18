import { fileURLToPath } from 'node:url'

import { workerLibraryBundle } from '../../test-support/test-bundles'

/** Build the real adapter with its imports, without root Vite config or disk output. */
export function storageWorkerBundle(): Promise<string> {
  return workerLibraryBundle(
    fileURLToPath(new URL('./storage-worker.ts', import.meta.url).href),
  )
}
