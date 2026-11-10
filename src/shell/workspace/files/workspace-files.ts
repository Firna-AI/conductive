import { useCallback, useEffect, useMemo } from 'react'
import { awaitsActivation } from '../../../app/first-start'
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

/** The connection of a workspace that has no project files yet: none. */
function connectNothing(): () => void {
  return () => {}
}

/**
 * The files of the open workspace, and their connection. The tab keeps one
 * store for each shown workspace, so a return shows the lists at once and
 * reads only the events after the last one. The hook connects the store
 * after the render and stops it at unmount. The Files part calls it. A
 * workspace from Conductor that waits for its activation has no project
 * files, so the store connects only when an activation succeeds.
 */
export function useWorkspaceFiles(context: WorkspaceContext): WorkspaceFiles {
  const create = useKeptLookup(context)
  const connect = awaitsActivation(context.workspace)
    ? connectNothing
    : startFiles
  const { store } = useWorkspaceStore(
    { orgId: context.org.id, workspaceId: context.workspace.id },
    { create, connect },
  )
  return store
}

/**
 * The same kept store for a part that shows files beside the Files part,
 * such as the file page of the centre. It connects nothing.
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
 * The kept store while `shows` is true, connected for as long, or null. The
 * chat calls it, so the list of `@` and the file chips work also on a phone
 * before a visit to Files. It shares the connection of the Files part. A
 * workspace from Conductor that waits for its activation gets null, because
 * it has no project files yet.
 */
export function useConnectedFilesWhile(
  context: WorkspaceContext,
  shows: boolean,
): WorkspaceFiles | null {
  const files = useKeptFilesWhile(
    context,
    shows && !awaitsActivation(context.workspace),
  )
  useEffect(() => (files ? startFiles(files) : undefined), [files])
  return files
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
