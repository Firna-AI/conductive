import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { FilesClient } from '../api/files-client'
import {
  browserTargets,
  FileActions,
  type FileActionTargets,
} from './file-actions'

/** How long the header shows that the text was copied, in ms. */
const copiedMs = 2_000

/** Copy and Download for one path, with the state that the header shows. */
export function useFileActions(
  client: FilesClient,
  path: string,
  targets: FileActionTargets = browserTargets,
) {
  const actions = useMemo(
    () => new FileActions(client, targets, path),
    [client, targets, path],
  )
  const state = useSyncExternalStore(
    actions.subscribe,
    actions.getSnapshot,
    actions.getSnapshot,
  )
  useEffect(() => {
    if (state.status !== 'copied') return
    const timer = setTimeout(() => actions.clearStatus(), copiedMs)
    return () => clearTimeout(timer)
  }, [actions, state.status])
  return {
    status: state.status,
    downloading: state.downloading,
    copy: (text: string) => void actions.copy(text),
    download: () => void actions.download(),
  }
}
