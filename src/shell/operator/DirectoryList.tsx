import { useEffect, type ReactNode } from 'react'
import { Table, type TableColumn } from '@firna/ui/table'
import directory from '../../../docs/mockups/src/components/operator/directory.module.css'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type {
  DirectoryResult,
  OperatorDirectory,
} from '../../app/operator-directory'
import { useStore } from '../../app/store'
import { ActionButton } from '../ui/actions'
import { LoadFailure } from '../ui/LoadFailure'
import { useViewport, type Viewport } from '../ui/viewport'
import { counted } from './format'
import { tableSize } from './OverviewParts'
import { EmptyRows } from './TargetParts'

/**
 * The width of a column of days, which fits a day of another year on one
 * line, such as 30 Sept 2026.
 */
export const dayWidth = 100

/** What differs between the tabs that list and search. */
export interface DirectoryKind<Row> {
  /** The title of the box of the rows, such as Orgs. */
  title: string
  /** The noun of one row and of many, such as org and orgs. */
  one: string
  many: string
  /** The line of a search with no match: what the search finds. */
  keys: string
  columns: Readonly<Record<Viewport, TableColumn[]>>
  rowKey: (row: Row) => string
  /** The line that counts the matches of a search, when it differs. */
  matches?: (result: DirectoryResult<Row>) => string | null
  /** The line that counts the rows, in place of the newest first. */
  summary?: (result: DirectoryResult<Row>) => string
  /** The line of a search with no match, when it differs. */
  noMatch?: (search: string) => string
  /** The box of a list with no row and no search, when it differs. */
  nothing?: ReactNode
  /** What a first read that failed names, when it differs from `many`. */
  failure?: string
}

/** The line above the rows that counts them. */
function summaryOf<Row>(
  kind: DirectoryKind<Row>,
  result: DirectoryResult<Row>,
): string {
  const { search, total } = result
  if (total === 0) return kind.keys
  if (kind.summary) return kind.summary(result)
  const rows = counted(total, kind.one, kind.many)
  if (search === '') return `${rows}, newest first.`
  const verb = total === 1 ? 'matches' : 'match'
  return kind.matches?.(result) ?? `${rows} ${verb} “${search}”.`
}

/**
 * The rows of a search, or the newest rows, in a box with the line that
 * counts them, and Show more while more rows wait. A search with no match
 * says so in place of the table. The first load shows placeholder rows.
 */
export function DirectoryList<Row>(props: {
  kind: DirectoryKind<Row>
  directory: OperatorDirectory<Row>
  search: string
  cell: (row: Row, key: string) => ReactNode
}) {
  const { kind, directory: model, search } = props
  const viewport = useViewport()
  useEffect(() => model.watch(search), [model, search])
  const { result, reading, failure } = useStore(model.state)
  if (failure?.read === 'first') {
    return (
      <LoadFailure
        error={failure.error}
        retry={() => model.retry()}
        title={`The ${kind.failure ?? kind.many} could not load`}
      />
    )
  }
  const table = (rows: readonly Row[], loading: boolean) => (
    <Table
      accessibilityLabel={kind.title}
      cell={props.cell}
      columns={kind.columns[viewport]}
      loading={loading}
      rowKey={kind.rowKey}
      rows={[...rows]}
      size={tableSize[viewport]}
    />
  )
  if (!result) return <Section title={kind.title}>{table([], true)}</Section>
  const listed = result.search === ''
  if (listed && result.rows.length === 0 && kind.nothing) return kind.nothing
  const empty = listed
    ? `Each new ${kind.one} shows here.`
    : (kind.noMatch?.(result.search) ??
      `No ${kind.one} matches “${result.search}”.`)
  return (
    <Section description={summaryOf(kind, result)} title={kind.title}>
      {result.rows.length === 0 ? (
        <EmptyRows>{empty}</EmptyRows>
      ) : (
        table(result.rows, false)
      )}
      {failure?.read === 'more' ? (
        <LoadFailure
          error={failure.error}
          retry={() => model.retry()}
          title={`More ${kind.many} could not load`}
        />
      ) : null}
      {failure === null && result.nextCursor !== null ? (
        <div className={directory.more}>
          <ActionButton
            busy={reading === 'more'}
            onPress={() => void model.more()}
            tone="plain"
          >
            Show more
          </ActionButton>
        </div>
      ) : null}
    </Section>
  )
}
