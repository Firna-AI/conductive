import type { ApiError } from '../api/client'
import type { Loadable } from '../store'
import {
  paletteReads,
  type PaletteQuery,
  type PaletteRead,
  type PaletteSource,
} from './palette-source'

/**
 * What stands first, in place of the workspace groups of a tab, while the
 * data that they need loads or after its read failed: a spinner, or a
 * notice that names what failed. Try again reads again each read of
 * `retry`.
 */
export type PaletteStatus =
  | { kind: 'loading' }
  | {
      kind: 'failed'
      /** The title of the notice, which names what did not load. */
      title: string
      error: ApiError
      retry: readonly PaletteRead[]
    }

const failureTitles: Readonly<Record<PaletteRead, string>> = {
  list: "The workspaces didn't load",
  repositories: "The repositories didn't load",
}

function errorOf(loadable: Loadable<unknown>): ApiError | null {
  return loadable.state === 'failed' ? loadable.error : null
}

/**
 * The status part of a tab, or `null` when its workspace groups can show.
 * Only the All and the Workspaces tabs show workspaces. Their rows need
 * the list, and a search also needs the repository names. A failure shows
 * before a load, because the person can act on it at once. When both
 * reads failed, the notice names the workspaces, because a failed list
 * hides every workspace row. Try again reads again each read that failed.
 */
export function paletteStatus(
  query: PaletteQuery,
  source: PaletteSource,
  searching: boolean,
): PaletteStatus | null {
  if (source.org === null) return null
  if (query.tab !== 'all' && query.tab !== 'workspaces') return null
  const loads: Readonly<Record<PaletteRead, Loadable<unknown>>> = {
    list: source.list,
    repositories: source.repositories,
  }
  const needed: readonly PaletteRead[] = searching ? paletteReads : ['list']
  const retry = paletteReads.filter((read) => loads[read].state === 'failed')
  for (const read of needed) {
    const error = errorOf(loads[read])
    if (error) {
      return { kind: 'failed', title: failureTitles[read], error, retry }
    }
  }
  const waits = needed.some((read) => loads[read].state === 'loading')
  return waits ? { kind: 'loading' } : null
}
