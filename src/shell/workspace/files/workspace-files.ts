import { useCallback, useMemo } from 'react'
import {
  useWorkspaceStore,
  type WorkspaceIdentity,
} from '../../../app/workspace-store'
import type { WorkspaceFiles } from '../../../files/model/files-store'
import {
  fetchedDownload,
  saveFromMemory,
} from '../../../files/page/fetched-download'
import type { FileActionTargets } from '../../../files/page/file-actions'
import { useApp, useOrgServices } from '../../context'
import type { WorkspaceContext } from '../features'
import { shownWorkspaces } from '../tab-memory'
import { startFiles } from './files-store'

/** Finds the kept store of a workspace, or makes it. It starts nothing. */
function useKeptLookup(context: WorkspaceContext) {
  const app = useApp()
  const { viewer } = context
  return useCallback(
    ({ orgId, workspaceId }: WorkspaceIdentity) =>
      shownWorkspaces(app, viewer).files(orgId, workspaceId),
    [app, viewer],
  )
}

/** The connect of a store that stays stopped, as in an archived workspace. */
function stayStopped(): () => void {
  return () => undefined
}

/**
 * The files of the open workspace, and their one connection. The tab keeps
 * one store for each shown workspace, so a return shows the lists at once
 * and reads only the events after the last one. While `connects` holds, the
 * hook connects the store after the render, and it stops it at unmount or
 * when `connects` ends. Only `KeptFilesConnection` calls it, and the parts
 * that show files only read the store.
 */
export function useWorkspaceFiles(
  context: WorkspaceContext,
  connects: boolean,
): WorkspaceFiles {
  const create = useKeptLookup(context)
  const { store } = useWorkspaceStore(
    { orgId: context.org.id, workspaceId: context.workspace.id },
    { create, connect: connects ? startFiles : stayStopped },
  )
  return store
}

/**
 * The same kept store for a part that shows files, such as the Files part,
 * the file page of the centre, and the local work of the pull request bar.
 * It connects nothing: the workspace screen connects the store.
 */
export function useKeptFiles(context: WorkspaceContext): WorkspaceFiles {
  const lookup = useKeptLookup(context)
  const { org, workspace } = context
  return useMemo(
    () => lookup({ orgId: org.id, workspaceId: workspace.id }),
    [lookup, org.id, workspace.id],
  )
}

/**
 * The same kept store for a part that shows files only in some states, such
 * as the file tabs of the chat, or null while `shows` is false. It makes no
 * store while it returns null, and it connects nothing.
 */
export function useKeptFilesWhile(
  context: WorkspaceContext,
  shows: boolean,
): WorkspaceFiles | null {
  const lookup = useKeptLookup(context)
  const { org, workspace } = context
  return useMemo(
    () => (shows ? lookup({ orgId: org.id, workspaceId: workspace.id }) : null),
    [shows, lookup, org.id, workspace.id],
  )
}

/**
 * Copy and Download over the services of the org. Download reads the route
 * with the fetch of the org, so the Mac app reads it from its own Worker,
 * and a refusal of a suspended org marks the org. The object stays the same
 * for the same services, as the pages need.
 */
export function useFileTargets(orgId: string): FileActionTargets {
  const services = useOrgServices(orgId)
  return useMemo(
    () => ({
      writeText: (text) => services.copy(text),
      download: fetchedDownload(services.api.fetch, saveFromMemory),
    }),
    [services],
  )
}
