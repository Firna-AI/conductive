import { join } from 'node:path'

import { buildWorkerLibrary } from './test-bundles'

declare module 'vitest' {
  interface ProvidedContext {
    nativeWorkspaceBundle?: string
  }
}

let standaloneBundle: Promise<string> | undefined

export async function nativeWorkspaceBundle(): Promise<string> {
  if (process.env.VITEST_WORKER_ID !== undefined) {
    const { inject } = await import('vitest')
    const provided = inject('nativeWorkspaceBundle')
    if (provided !== undefined) return provided
  }
  return (standaloneBundle ??= buildNativeWorkspaceBundle())
}

// The global setup builds it again for each watch rerun, so it skips the
// cache of `workerLibraryBundle`, which lives for the whole process.
export function buildNativeWorkspaceBundle(): Promise<string> {
  return buildWorkerLibrary(
    join(import.meta.dirname, 'native-workspace-entry.ts'),
  )
}
