import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { ConductorDocuments } from '../../../app/conductor-documents'
import type { RenderedTab, TabDraw } from '../../../chat/components/tab-row'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { documentHref, type DocumentTab } from './document-address'
import { withoutDocumentTab } from './document-view'
import { useDocumentList } from './use-old-documents'
import {
  DocumentTabItem,
  documentName,
  LiftedDocumentTab,
} from './DocumentTabItem'

/**
 * The tab of an old session at its place in the row. Close takes the tab
 * out of the saved view, and Close of the shown tab shows the chat with
 * its session. An archived workspace changes its view in the browser only,
 * as its session tabs do.
 */
function DocumentRowTab(props: {
  context: WorkspaceContext
  tab: DocumentTab
  name: string
  shown: boolean
  draw: Extract<TabDraw, { kind: 'row' }>
}) {
  const { context, tab, draw } = props
  const go = useNavigation()
  const { org, workspace } = context
  const close = () => {
    const sessionId = context.savedView.getSnapshot().activeSessionId
    const session: WorkspaceTab | null = sessionId
      ? { kind: 'session', sessionId }
      : null
    context.savedView.updateView((view) =>
      withoutDocumentTab(view, tab.documentId, session),
    )
    if (props.shown) go.push(routes.workspace(org.id, workspace.id))
  }
  return (
    <DocumentTabItem
      close={draw.close}
      href={documentHref(org.id, workspace.id, tab.documentId)}
      item={draw.item}
      link={draw.link}
      name={props.name}
      onClose={close}
      selected={props.shown}
    />
  )
}

/**
 * Names and draws the tabs of the old sessions from Conductor in the row,
 * with the titles of their list. `shown` is the document that the centre
 * shows, if any. A workspace that came from no import has no such tab.
 */
export function useDocumentTabs(
  context: WorkspaceContext,
  documents: ConductorDocuments | null,
  shown: string | null,
): (tab: DocumentTab) => RenderedTab | null {
  const list = useDocumentList(documents)
  return (tab) => {
    if (!documents) return null
    const document =
      list.state === 'ready'
        ? (list.value.find((item) => item.id === tab.documentId) ?? null)
        : null
    const name = documentName(document)
    return {
      title: name,
      draw: (draw) =>
        draw.kind === 'lifted' ? (
          <LiftedDocumentTab name={name} />
        ) : (
          <DocumentRowTab
            context={context}
            draw={draw}
            name={name}
            shown={shown === tab.documentId}
            tab={tab}
          />
        ),
    }
  }
}
