import {
  E2bClient,
  type E2bClientOptions,
} from '../../worker/sandbox/e2b/client'
import { openLiveState } from './live-state'
import type { SandboxProvider } from '../../worker/sandbox/provider'

export type E2bLiveSandbox = SandboxProvider & Pick<E2bClient, 'writeFile'>

export async function openLiveProvider(
  root: string,
  directory: string,
  options: Omit<E2bClientOptions, 'db' | 'allocationMode'>,
) {
  const state = await openLiveState(root, directory)
  return {
    ...state,
    provider: new E2bClient({ ...options, db: state.db }),
    cleanupProvider: new E2bClient({
      ...options,
      db: state.db,
      allocationMode: 'cleanup',
    }),
  }
}

export type LiveProvider = Awaited<ReturnType<typeof openLiveProvider>>
