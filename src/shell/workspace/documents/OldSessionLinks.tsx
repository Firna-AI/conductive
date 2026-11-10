import type { ReactNode } from 'react'
import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { ChevronRight, CircleAlert, FileText, History } from 'lucide-react'
import { EmptyState } from '../../../../docs/mockups/src/components/common/EmptyState'
import styles from '../../../../docs/mockups/src/components/conductor-import/ImportedParts.module.css'
import waitStyles from '../../../../docs/mockups/src/components/workspace/SandboxNotice.module.css'
import type { ConductorDocuments } from '../../../app/conductor-documents'
import { useNavigation } from '../../../app/navigation'
import { useServices } from '../../../app/services'
import type { Loadable } from '../../../app/store'
import { AgentMark } from '../../../chat/components/AgentMark'
import type { MenuEntry } from '../../../chat/ui/Menu'
import type { ConductorOldDocument } from '../../../shared/conductor-import'
import type { ImportSessionMetadata } from '../../../shared/import-session'
import { ActionButton } from '../../ui/actions'
import { AppLink } from '../../ui/AppLink'
import type { WorkspaceContext } from '../features'
import { documentHref } from './document-address'
import { documentName } from './DocumentTabItem'
import { ResumedLine } from './ResumedLine'
import { useDocumentList, useOldDocuments } from './use-old-documents'

/** The short day of an old session, such as 3 Nov. */
function shortDay(time: number, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(time)
}

/** The count and the day of an old session, such as "33 messages · 3 Nov". */
function sessionDetail(document: ConductorOldDocument, timeZone?: string) {
  const { messageCount } = document
  const count = `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`
  return document.occurredAt === null
    ? count
    : `${count} · ${shortDay(document.occurredAt, timeZone)}`
}

/** The links themselves, once the list came. */
function LinkList(props: {
  context: WorkspaceContext
  documents: readonly ConductorOldDocument[]
}) {
  const { org, workspace } = props.context
  const { timeZone } = useServices()
  return (
    <section aria-label="Sessions from Conductor" className={styles.links}>
      <History aria-hidden className={styles.icon} size={26} />
      <h2 className={styles.heading}>From Conductor</h2>
      <p className={styles.body}>Open a session to read it as a document.</p>
      <ul aria-label="Sessions" className={styles.list}>
        {props.documents.map((document) => (
          <li key={document.id}>
            <AppLink
              className={styles.row}
              to={documentHref(org.id, workspace.id, document.id)}
            >
              <AgentMark agent={document.agent} />
              <span className={styles.title}>{documentName(document)}</span>
              <span className={styles.detail}>
                {sessionDetail(document, timeZone)}
              </span>
              <ChevronRight aria-hidden className={styles.chevron} size={14} />
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The wait for the list, at the place where the links will show. */
function Waiting() {
  const theme = useSharedUiTheme()
  return (
    <div className={waitStyles.waiting}>
      <Spinner color={theme.colors.muted} size={13} />
      Loading the sessions from Conductor
    </div>
  )
}

/**
 * The sessions that the workspace kept from Conductor, as links in place of
 * an empty chat: no open session, or a new session with nothing to show.
 * Each one opens its document, in each state of the workspace. A list that
 * did not load offers Try again. A workspace with no old session shows the
 * empty chat of the app.
 */
function OldSessionLinks(props: {
  context: WorkspaceContext
  documents: ConductorDocuments
  list: Loadable<readonly ConductorOldDocument[]>
}): ReactNode {
  const { list, documents } = props
  switch (list.state) {
    case 'loading':
      return <Waiting />
    case 'failed':
      return (
        <EmptyState
          action={
            <ActionButton onPress={() => void documents.reload()}>
              Try again
            </ActionButton>
          }
          body={list.error.message}
          icon={CircleAlert}
          title="The sessions from Conductor didn't load"
        />
      )
    case 'ready':
      return list.value.length === 0 ? null : (
        <LinkList context={props.context} documents={list.value} />
      )
  }
}

/** What the chat of a workspace from Conductor shows of its old sessions. */
export interface OldSessions {
  /** The links in place of an empty chat, or null for the empty chat. */
  empty: ReactNode | null
  /** The old sessions in the session history, under their own label. */
  history: MenuEntry[]
  /** The first line of a session that continues an old session. */
  line?: (metadata: ImportSessionMetadata) => ReactNode
}

/**
 * The old sessions of a workspace from Conductor, for its chat: the links
 * in place of an empty chat, and the entries of the session history, so
 * that each old session stays one click away after a new chat fills the
 * tab. A workspace that came from no import has neither.
 */
export function useOldSessions(context: WorkspaceContext): OldSessions {
  const documents = useOldDocuments(context)
  const list = useDocumentList(documents)
  const navigation = useNavigation()
  const { timeZone } = useServices()
  if (!documents) return { empty: null, history: [] }
  const { org, workspace } = context
  const line = (metadata: ImportSessionMetadata) => (
    <ResumedLine
      href={documentHref(org.id, workspace.id, metadata.documentId)}
      preparation={metadata.preparation}
      title={documentName(documents.document(metadata.documentId))}
    />
  )
  const empty = (
    <OldSessionLinks context={context} documents={documents} list={list} />
  )
  if (list.state !== 'ready' || list.value.length === 0) {
    return { empty: list.state === 'ready' ? null : empty, history: [], line }
  }
  return {
    line,
    empty,
    history: [
      { kind: 'label', label: 'From Conductor' },
      ...list.value.map((document): MenuEntry => ({
        kind: 'item',
        key: `conductor-document:${document.id}`,
        label: documentName(document),
        mark: <AgentMark agent={document.agent} />,
        detail:
          document.occurredAt === null
            ? undefined
            : shortDay(document.occurredAt, timeZone),
        trailingIcon: FileText,
        onSelect: () =>
          navigation.push(documentHref(org.id, workspace.id, document.id)),
      })),
    ],
  }
}
