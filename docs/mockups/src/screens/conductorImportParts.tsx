import { Spinner } from '@firna/ui/spinner'
import { useSharedUiTheme } from '@firna/ui/theme'
import { FolderOpen, ShieldCheck } from 'lucide-react'
import { ActionButton } from '../components/common/actions'
import { EmptyState } from '../components/common/EmptyState'
import { LinkedControl } from '../components/common/LinkedControl'
import {
  ImportList,
  importable,
} from '../components/conductor-import/ImportList'
import {
  ImportProgress,
  ImportResult,
  type ImportItem,
} from '../components/conductor-import/ImportProgress'
import { productName } from '../brand'
import {
  conductorRows,
  firstSelection,
  rowsAfterImport,
  uploadProgress,
  type ConductorRow,
} from '../fixtures/conductorImport'
import {
  importReport,
  rowsWithExpired,
  rowsWithUnfinished,
} from '../fixtures/conductorUploads'
import { importedWorkspaces } from '../fixtures/importedWorkspaces'
import type { ImportLinks } from './conductorImportLinks'
import type { ConductorImportState } from './conductorImportState'
import styles from './conductorImportParts.module.css'

/** The rows that the list finds in a state. */
export function rowsOf(state: ConductorImportState): readonly ConductorRow[] {
  switch (state.rows) {
    case 'first':
      return conductorRows
    case 'after-import':
      return rowsAfterImport
    case 'unfinished':
      return rowsWithUnfinished
    case 'expired':
      return rowsWithExpired
    case 'none':
      return []
  }
}

/** The rows that a state selects. Only a row that can import is selected. */
export function selectedOf(
  state: ConductorImportState,
  rows: readonly ConductorRow[],
): ReadonlySet<string> {
  const choices = rows.filter(importable).map((row) => row.id)
  switch (state.selection) {
    case 'all':
      return new Set(choices)
    case 'two':
      return new Set(choices.filter((id) => firstSelection.includes(id)))
    case 'one':
      return new Set(choices.slice(0, 1))
    case 'none':
      return new Set()
  }
}

/** The steps of the upload of the first import, and Try again of it. */
type UploadStep = 'uploading' | 'progress' | 'done' | 'retry'

/**
 * The bytes of each workspace of the first import that went up by a step.
 * The Mac app uploads them in turn. At the start the first one goes up,
 * then the second one, and at the end both are up. Try again sends only
 * the second one, from the parts that its stopped upload stored.
 */
function sentIn(step: UploadStep, row: ConductorRow, index: number): number {
  switch (step) {
    case 'uploading':
      return index === 0 ? uploadProgress.first : 0
    case 'progress':
      return index === 0 ? row.upload : uploadProgress.sent
    case 'done':
      return row.upload
    case 'retry':
      return uploadProgress.retry
  }
}

/** The workspaces of an upload step, each with the row it came from. */
function importItems(step: UploadStep): ImportItem[] {
  const items = importedWorkspaces.map((workspace, index) => {
    const row = conductorRows[index]
    return { workspace, row, sent: sentIn(step, row, index) }
  })
  return step === 'retry' ? items.slice(1) : items
}

/** A wait of the page, with a spinner while the Mac app reads. */
function Waiting(props: { text: string; busy: boolean }) {
  const theme = useSharedUiTheme()
  return (
    <p className={styles.waiting}>
      {props.busy ? <Spinner color={theme.colors.muted} size={13} /> : null}
      {props.text}
    </p>
  )
}

/** The list, with what the import does above it, or no workspace to list. */
function ListBody(props: { state: ConductorImportState; links: ImportLinks }) {
  const rows = rowsOf(props.state)
  if (rows.length === 0) {
    return (
      <EmptyState
        body="The workspaces that are open in Conductor on this Mac show here."
        icon={FolderOpen}
        title="Nothing to import yet"
      />
    )
  }
  return (
    <>
      <p className={styles.intro}>
        Each workspace joins Import from Conductor with its chats when its
        upload ends. Its cloud computer starts when you activate it.
      </p>
      <ImportList
        admin={props.state.viewer === 'admin'}
        chipTo={props.links.workspace}
        retryTo={props.links.retry}
        rows={rows}
        selected={selectedOf(props.state, rows)}
      />
    </>
  )
}

/** The steps that show the page of the import. */
export type PageStep = Exclude<
  ConductorImportState['step'],
  'offer' | 'settings'
>

/**
 * What the page of the import shows in each step after the entry. Its
 * controls lead where `links` says.
 */
export function ImportPageBody(props: {
  state: ConductorImportState
  step: PageStep
  links: ImportLinks
}) {
  const { links } = props
  switch (props.step) {
    case 'consent':
      return <Waiting busy={false} text="Waiting for your answer" />
    case 'reading':
      return <Waiting busy text="Reading your Conductor workspaces" />
    case 'denied':
      return (
        <EmptyState
          action={
            <LinkedControl to={links.consent}>
              <ActionButton>Ask again</ActionButton>
            </LinkedControl>
          }
          body={`${productName} reads your Conductor data on this Mac only after you allow it.`}
          icon={ShieldCheck}
          title="Allow access to list your workspaces"
        />
      )
    case 'uploading':
    case 'progress':
      return (
        <ImportProgress
          chipTo={links.workspace}
          items={importItems(props.step)}
          note="Each workspace joins Import from Conductor when its upload ends."
        />
      )
    case 'retry':
      return (
        <ImportProgress
          chipTo={links.workspace}
          items={importItems('retry')}
          note="Try again sends only the parts that are missing."
        />
      )
    case 'done':
      return (
        <ImportResult
          chipTo={links.workspace}
          items={importItems('done')}
          report={importReport}
        />
      )
    case 'list':
      return <ListBody links={links} state={props.state} />
  }
}
