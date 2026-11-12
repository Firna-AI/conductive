import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { FilesClient } from '../api/files-client'
import type { FilesResult } from '../api/files-errors'
import { pathLabel } from '../model/file-labels'
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
 * it. A reply for a path that the page no longer shows never shows. With
 * `follow` off, such as while the sandbox does not run, it reads nothing,
 * and the state stays as the last read left it. When `follow` turns on, it
 * reads at once. The store keeps the label of each reply, so the tab of a
 * path that no list names can show it.
 */
export function useFollowed<T extends { path: string; displayPath?: string }>(
  files: WorkspaceFiles,
  read: Read<T>,
  path: string,
  follow = true,
): { state: Loaded<T> | null; retry: () => void } {
  const loader = useMemo(
    () =>
      new ResourceLoader<T>((key, signal) => read(files.client, key, signal)),
    [files, read],
  )
  useEffect(
    () => (follow ? followPath(files, loader, path) : undefined),
    [files, loader, path, follow],
  )
  const state = useSyncExternalStore(
    loader.subscribe,
    loader.getSnapshot,
    loader.getSnapshot,
  )
  const shown = state?.key === path ? state : null
  const reply = shown?.status === 'ready' ? shown.value : null
  useEffect(() => {
    if (reply && reply.path === path)
      files.noteReadLabel(path, pathLabel(reply))
  }, [files, path, reply])
  return {
    state: shown,
    retry: () => loader.retry(),
  }
}
