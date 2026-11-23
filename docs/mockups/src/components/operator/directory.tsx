import type { ReactNode } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Table, type TableColumn } from '@firna/ui/table'
import type { TargetStatus } from '../../fixtures/operatorDirectory'
import type { UserStatus } from '../../fixtures/operatorUsers'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { instanceKey } from '../../instanceKey'
import styles from '../../../../../src/ui/components/operator/directory.module.css'

/**
 * The state of a suspended or deleted target, or of a user who waits on
 * the waitlist. A target in use shows none.
 */
export function TargetState(props: {
  status: TargetStatus | UserStatus
  /** The key of the row, which names the state for Mokly. */
  id: string
}) {
  const name = `state-${props.id}`
  switch (props.status) {
    case 'active':
      return null
    case 'suspended':
      return (
        <statusText.Component
          icon="ban"
          label="Suspended"
          moklyInstance={name}
          tone="danger"
        />
      )
    case 'deleted':
      return (
        <statusText.Component
          icon="trash-2"
          label="Deleted"
          moklyInstance={name}
          tone="muted"
        />
      )
    case 'waiting':
      return (
        <statusText.Component
          icon="hourglass"
          label="Waiting"
          moklyInstance={name}
          tone="warning"
        />
      )
  }
}

/**
 * A name cell: the mark, the name as a link, and a muted line under it.
 * A phone can add a second muted line for the columns that it leaves out.
 */
export function NameCell(props: {
  mark: ReactNode
  name: ReactNode
  detail?: ReactNode
  more?: ReactNode
}) {
  return (
    <span className={styles.nameCell}>
      {props.mark}
      <span className={styles.nameText}>
        {props.name}
        {props.detail ? (
          <span className={styles.nameDetail}>{props.detail}</span>
        ) : null}
        {props.more ? (
          <span className={styles.nameDetail}>{props.more}</span>
        ) : null}
      </span>
    </span>
  )
}

/**
 * The provider account of an org by its ID, in the monospace font, in a
 * cell or in the line under a name. It takes the colour of its place.
 */
export function AccountId(props: { id: string }) {
  return <span className={styles.account}>{props.id}</span>
}

/**
 * The results of a search, or the newest targets: a table with a line
 * that counts them, and Show more while more results wait. With no
 * result, the box says so in place of the table.
 */
export function DirectoryTable<Row>(props: {
  title: string
  summary: string
  rows: readonly Row[]
  columns: Readonly<Record<Viewport, TableColumn[]>>
  cell: (row: Row, key: string) => ReactNode
  rowKey: (row: Row) => string
  viewport: Viewport
  empty: string
  more: boolean
}) {
  const mobile = props.viewport === 'mobile'
  return (
    <section.Component
      description={props.summary}
      moklyInstance={`${instanceKey(props.title)}-section`}
      title={props.title}
    >
      {props.rows.length === 0 ? (
        <p className={styles.empty}>{props.empty}</p>
      ) : (
        <Table
          accessibilityLabel={props.title}
          cell={props.cell}
          columns={props.columns[props.viewport]}
          rowKey={props.rowKey}
          rows={[...props.rows]}
          size={mobile ? 'md' : 'sm'}
        />
      )}
      {props.more ? (
        <div className={styles.more}>
          <actionButton.Component moklyInstance="show-more" tone="plain">
            Show more
          </actionButton.Component>
        </div>
      ) : null}
    </section.Component>
  )
}
