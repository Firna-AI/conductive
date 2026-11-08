import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { FilesClient } from '../api/files-client'
import type { FilesResult } from '../api/files-errors'
import type { WorkspaceFiles } from '../model/files-store'
import { followPath } from '../model/follow-path'
import { ResourceLoader, type Loaded } from '../model/resource-loader'

type Read<T> = (
  client: FilesClient,
  path: string,
  signal: AbortSignal,
) => Promise<FilesResult<T>>

/**
 * Reads one file or one diff, and reads it again when an event may change
 * it. A reply for a path that the page no longer shows never shows.
 */
export function useFollowed<T>(
  files: WorkspaceFiles,
  read: Read<T>,
  path: string,
): { state: Loaded<T> | null; retry: () => void } {
  const loader = useMemo(
    () =>
      new ResourceLoader<T>((key, signal) => read(files.client, key, signal)),
    [files, read],
  )
  useEffect(() => followPath(files, loader, path), [files, loader, path])
  const state = useSyncExternalStore(
    loader.subscribe,
    loader.getSnapshot,
    loader.getSnapshot,
  )
  return {
    state: state?.key === path ? state : null,
    retry: () => loader.retry(),
  }
}
