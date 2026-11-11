import type { ReactNode } from 'react'
import type { WorkspaceContext } from '../features'
import { documentPlace, type DocumentTab } from './document-address'
import { DocumentPage } from './DocumentPage'
import { useOldDocuments } from './use-old-documents'

/** The page of the old session at its address, with the kept documents. */
function DocumentCenter(props: {
  context: WorkspaceContext
  tab: DocumentTab
}) {
  const { context } = props
  const documents = useOldDocuments(context)
  if (!documents) return null
  return (
    <DocumentPage
      context={context}
      documents={documents}
      layout={context.viewport === 'phone' ? 'phone' : 'desktop'}
      tab={props.tab}
    />
  )
}

/**
 * The page of the old session from Conductor that the address names, or
 * null. Desktop shows it in place of the chat of its session, under the
 * tab row. A phone shows it in the Chat tab in place of the chat, with a
 * way back. It shows in each state of the workspace, also archived, and
 * only in a workspace that came from an import.
 */
export function documentCenter(context: WorkspaceContext): ReactNode {
  if (context.workspace.conductorImport === undefined) return null
  const tab = documentPlace(context.view)
  return tab ? <DocumentCenter context={context} tab={tab} /> : null
}
