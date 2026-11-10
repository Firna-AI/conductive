import { useEffect, useMemo, useRef } from 'react'
import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type {
  FileListKind,
  FilesNavigation,
  FilesTab,
  FilesTarget,
} from '../../../files/navigation'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import type { SavedView, WorkspaceContext } from '../features'
import { saveView, useSavedView, useViewKnown } from '../saved-view'
import { filesHref, filesPlace } from './files-address'
import { withActiveTab, withFileList } from './view-tabs'

/**
 * The navigation of the Files screens of the open workspace. A plain click
 * saves the change in the workspace view, then moves the address. On
 * desktop a list belongs to the right column, so the address keeps the tab
 * of the centre, and only a list address follows the new list.
 */
export function useFilesNavigation(context: WorkspaceContext): FilesNavigation {
  const navigation = useNavigation()
  const { org, workspace, viewport, savedView } = context
  const onList = filesPlace(context.view)?.kind === 'list'
  return useMemo(() => {
    const href = (target: FilesTarget) =>
      filesHref(org.id, workspace.id, target)
    return {
      href,
      navigate: (target) => {
        if (target.kind !== 'list') {
          saveView(savedView, (view) => withActiveTab(view, target))
          navigation.push(href(target))
          return
        }
        saveView(savedView, (view) => withFileList(view, target.list))
        if (viewport === 'phone') navigation.push(href(target))
        else if (onList) navigation.replace(href(target))
      },
    }
  }, [navigation, org.id, workspace.id, viewport, savedView, onList])
}

/** An address that names a list saves that list, once the view is known. */
export function useAddressList(
  saved: SavedView,
  list: FileListKind | null,
): void {
  const known = useViewKnown(saved)
  useEffect(() => {
    if (known && list) saved.updateView((view) => withFileList(view, list))
  }, [saved, known, list])
}

/**
 * A file or diff page that shows keeps its tab open and active in the saved
 * view, also when its address came from a link or the browser history.
 */
export function useOpenTab(saved: SavedView, tab: FilesTab): void {
  const known = useViewKnown(saved)
  const { path } = tab
  const mode = tab.kind === 'file' ? tab.mode : null
  useEffect(() => {
    if (!known) return
    const shown: FilesTab =
      mode === null ? { kind: 'diff', path } : { kind: 'file', path, mode }
    saved.updateView((view) => withActiveTab(view, shown))
  }, [saved, known, path, mode])
}

/**
 * While a file, a diff, or an old session from Conductor shows in the
 * centre, the chat can make a session the active tab: a click on its tab,
 * a new session, or a reopened one. The address then goes back to the
 * chat, which shows that session.
 */
export function useLeaveForSession(
  context: WorkspaceContext,
  showsTab: boolean,
): void {
  const navigation = useNavigation()
  const active = useSavedView(context.savedView)?.activeTab ?? null
  const before = useRef<WorkspaceTab | null>(active)
  const { org, workspace } = context
  useEffect(() => {
    const previous = before.current
    before.current = active
    const leftPage = previous !== null && previous.kind !== 'session'
    if (showsTab && active?.kind === 'session' && leftPage) {
      navigation.push(routes.workspace(org.id, workspace.id))
    }
  }, [navigation, org.id, workspace.id, showsTab, active])
}
