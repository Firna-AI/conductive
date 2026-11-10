import { useEffect, useState, type ReactNode } from 'react'
import { CircleAlert, File, FileX } from 'lucide-react'
import type { ConductorDocuments } from '../../../app/conductor-documents'
import { routes } from '../../../app/router'
import { CodeView } from '../../../files/code/CodeView'
import { MarkdownView } from '../../../files/markdown/MarkdownView'
import type { FileMode, FilesLayout } from '../../../files/navigation'
import styles from '../../../files/page/FilePage.module.css'
import { ViewSwitch } from '../../../files/page/ViewSwitch'
import { ActionButton } from '../../../files/ui/actions'
import { EmptyState, Loading } from '../../../files/ui/EmptyState'
import { LayoutRoot } from '../../../files/ui/layout'
import type { SavedView, WorkspaceContext } from '../features'
import { useViewKnown } from '../saved-view'
import type { DocumentTab } from './document-address'
import { withDocumentTab } from './document-view'
import { documentName } from './DocumentTabItem'
import { DocumentHeader } from './DocumentHeader'
import { useDocumentList } from './use-old-documents'
import {
  useDocumentActions,
  useDocumentText,
  type DocumentText,
} from './use-document-text'

/** The count of messages of an old session, as its header names it. */
function messageCount(count: number): string {
  return `${count} ${count === 1 ? 'message' : 'messages'}`
}

/**
 * A page that shows keeps its tab open and active in the saved view, also
 * when its address came from a link or the browser history. An archived
 * workspace keeps the change in the browser, as its session tabs do.
 */
function useOpenDocumentTab(saved: SavedView, tab: DocumentTab): void {
  const known = useViewKnown(saved)
  const { documentId } = tab
  useEffect(() => {
    if (!known) return
    saved.updateView((view) =>
      withDocumentTab(view, { kind: 'conductor-document', documentId }),
    )
  }, [saved, known, documentId])
}

/** The body of the page: the wait, the failure, or the Markdown. */
function documentBody(
  text: DocumentText,
  mode: FileMode,
  name: string,
  retry: () => void,
): ReactNode {
  switch (text.state) {
    case 'loading':
      return <Loading label="Opening the session" />
    case 'failed':
      return text.status === 404 ? (
        <EmptyState icon={FileX} title="This session isn't available" />
      ) : (
        <EmptyState
          action={<ActionButton onPress={retry}>Try again</ActionButton>}
          alert
          icon={CircleAlert}
          title="This session didn't open"
        />
      )
    case 'ready':
      if (text.text === '') {
        return <EmptyState icon={File} title="This session is empty" />
      }
      return mode === 'preview' ? (
        <MarkdownView text={text.text} />
      ) : (
        <CodeView name={`${name}.md`} text={text.text} />
      )
  }
}

/**
 * An old session from Conductor as a page, in the Markdown view of the app:
 * a tab of the centre column on desktop, and a page of the Chat tab on a
 * phone, with a way back to the chat. It reads its Markdown from the routes
 * of the app, in each state of the workspace, and never from the cloud
 * computer, so its open starts nothing.
 */
export function DocumentPage(props: {
  context: WorkspaceContext
  documents: ConductorDocuments
  tab: DocumentTab
  layout: FilesLayout
}) {
  const { context, documents, tab } = props
  useOpenDocumentTab(context.savedView, tab)
  const list = useDocumentList(documents)
  const document =
    list.state === 'ready'
      ? (list.value.find((item) => item.id === tab.documentId) ?? null)
      : null
  const name = documentName(document)
  const { text, retry } = useDocumentText(documents, tab.documentId)
  const actions = useDocumentActions(name)
  const [mode, setMode] = useState<FileMode>('preview')
  const markdown = text.state === 'ready' ? text.text : null
  const { org, workspace } = context
  return (
    <LayoutRoot className={styles.page} label={name} layout={props.layout}>
      <DocumentHeader
        back={
          props.layout === 'phone'
            ? routes.workspace(org.id, workspace.id)
            : undefined
        }
        meta={document ? messageCount(document.messageCount) : undefined}
        name={name}
        onCopy={markdown === null ? undefined : () => actions.copy(markdown)}
        onDownload={
          markdown === null ? undefined : () => actions.download(markdown)
        }
        status={actions.status}
        viewSwitch={<ViewSwitch mode={mode} onChange={setMode} />}
      />
      <div className={styles.body}>{documentBody(text, mode, name, retry)}</div>
    </LayoutRoot>
  )
}
