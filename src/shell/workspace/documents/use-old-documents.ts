import { useEffect, useMemo } from 'react'
import type { ConductorDocuments } from '../../../app/conductor-documents'
import { loading, Store, useStore, type Loadable } from '../../../app/store'
import type { ConductorOldDocument } from '../../../shared/conductor-import'
import { useApp } from '../../context'
import type { WorkspaceContext } from '../features'
import { shownWorkspaces } from '../tab-memory'

/**
 * The old sessions of a workspace from Conductor, which the tab keeps, or
 * null for a workspace that came from no import. The first use reads the
 * list once. A return shows it at once, and reads it never again.
 */
export function useOldDocuments(
  context: WorkspaceContext,
): ConductorDocuments | null {
  const app = useApp()
  const { org, workspace, viewer } = context
  const imported = workspace.conductorImport !== undefined
  const documents = useMemo(
    () =>
      imported
        ? shownWorkspaces(app, viewer).documents(org.id, workspace.id)
        : null,
    [app, viewer, imported, org.id, workspace.id],
  )
  useEffect(() => documents?.open(), [documents])
  return documents
}

/** The list of a workspace that came from no import: it never loads. */
const noList = new Store<Loadable<readonly ConductorOldDocument[]>>(loading)

/** The list of the old sessions, as it loads, for a part that shows it. */
export function useDocumentList(
  documents: ConductorDocuments | null,
): Loadable<readonly ConductorOldDocument[]> {
  return useStore(documents?.list ?? noList)
}
