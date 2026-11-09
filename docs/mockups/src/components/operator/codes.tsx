import type { Viewport } from '@mokly/mokly'
import { Ban, Copy } from 'lucide-react'
import { TableCell, type TableColumn } from '@firna/ui/table'
import {
  codeState,
  meetupLisbon,
  type CodeRow,
  type CodeState,
} from '../../fixtures/operatorCodes'
import { paths } from '../../paths'
import { IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { InlineLink } from './targets'
import styles from './codes.module.css'

/**
 * A phone keeps the label, the uses, and the actions. It puts the code
 * under the label, and the state under the uses. It leaves out who made an
 * invite code and the day.
 */
export const codeColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'code', label: 'Code', width: 136 },
    { key: 'state', label: 'State', width: 92 },
    { key: 'uses', label: 'Uses', align: 'right', width: 72 },
    { key: 'disable', align: 'right', width: 44 },
  ],
  mobile: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'uses', label: 'Uses', align: 'right', width: 76 },
    { key: 'actions', align: 'right', width: 92 },
  ],
}

/** The state of a code as a glyph and a word. */
export function CodeStateText(props: { state: CodeState }) {
  switch (props.state) {
    case 'active':
      return <StatusText label="Active" tone="success" />
    case 'used-up':
      return <StatusText label="Used up" tone="muted" />
    case 'disabled':
      return <StatusText icon={Ban} label="Disabled" tone="muted" />
  }
}

/** The name of a code in a question or a button: its label, or its owner. */
function codeName(row: CodeRow): string {
  return row.kind === 'invite'
    ? row.label
    : `the referral code of @${row.owner}`
}

/**
 * Who made an invite code and when, or whose referral code it is. The
 * owner opens the page of that user.
 */
function Origin(props: { row: CodeRow }) {
  const { row } = props
  if (row.kind === 'invite')
    return (
      <>
        by @{row.madeBy} · {row.made}
      </>
    )
  return (
    <>
      of <InlineLink to={paths.operatorUser}>@{row.owner}</InlineLink>
    </>
  )
}

/**
 * The label of a code, or Referral code, and the line of its origin. A
 * phone gives the code under the label, and keeps the origin only for a
 * referral code, whose owner it names.
 */
function LabelCell(props: { row: CodeRow; viewport: Viewport }) {
  const { row } = props
  const mobile = props.viewport === 'mobile'
  return (
    <span className={styles.labelCell}>
      <span className={styles.label}>
        {row.kind === 'invite' ? row.label : 'Referral code'}
      </span>
      {mobile ? <span className={styles.code}>{row.code}</span> : null}
      {mobile && row.kind === 'invite' ? null : (
        <span className={styles.origin}>
          <Origin row={row} />
        </span>
      )}
    </span>
  )
}

function CopyButton(props: { row: CodeRow }) {
  return <IconButton icon={Copy} label={`Copy ${props.row.code}`} quiet />
}

/**
 * Disable for a code that still works. Disable is final, so it asks first.
 * A code that does not work keeps the place of the button empty.
 */
function DisableButton(props: { row: CodeRow }) {
  const { row } = props
  if (codeState(row) !== 'active') {
    return <span aria-hidden className={styles.noAction} />
  }
  const button = (
    <IconButton icon={Ban} label={`Disable ${codeName(row)}`} quiet />
  )
  if (row.code !== meetupLisbon.code) return button
  return (
    <ScreenLink asChild to={paths.operatorCodesDisable}>
      {button}
    </ScreenLink>
  )
}

/** The cells of a row of codes, for each viewport. */
export function codeCell(viewport: Viewport) {
  return function cell(row: CodeRow, key: string) {
    const uses = `${row.uses} of ${row.limit}`
    switch (key) {
      case 'label':
        return <LabelCell row={row} viewport={viewport} />
      case 'code':
        return (
          <span className={styles.codeCell}>
            <span className={styles.code}>{row.code}</span>
            <CopyButton row={row} />
          </span>
        )
      case 'uses':
        if (viewport === 'desktop') return <TableCell numeric>{uses}</TableCell>
        return (
          <span className={styles.usesCell}>
            <span className={styles.uses}>{uses}</span>
            <CodeStateText state={codeState(row)} />
          </span>
        )
      case 'state':
        return <CodeStateText state={codeState(row)} />
      case 'disable':
        return <DisableButton row={row} />
      default:
        return (
          <span className={styles.actions}>
            <CopyButton row={row} />
            <DisableButton row={row} />
          </span>
        )
    }
  }
}
