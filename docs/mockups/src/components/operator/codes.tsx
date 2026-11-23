import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { TableCell, type TableColumn } from '@firna/ui/table'
import {
  codeState,
  meetupLisbon,
  type CodeRow,
  type CodeState,
} from '../../fixtures/operatorCodes'
import { instanceKey } from '../../instanceKey'
import { paths } from '../../paths'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { statusText } from '../../entries/components/common/StatusText.mockup'
import {
  codeStateLabels,
  copyLabels,
  disableLabel,
  referralCodeLabel,
  referralCodeName,
} from '../../../../../src/ui/components/operator/codeCopy'
import { InlineLink } from './targets'
import styles from '../../../../../src/ui/components/operator/codes.module.css'

/**
 * A phone keeps the label, the uses, and Disable. It puts the code with
 * its copy buttons under the label, and the state under the uses. It
 * leaves out who made an invite code and the day.
 */
export const codeColumns: Readonly<Record<Viewport, TableColumn[]>> = {
  desktop: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'code', label: 'Code', width: 148 },
    { key: 'state', label: 'State', width: 92 },
    { key: 'uses', label: 'Uses', align: 'right', width: 72 },
    { key: 'disable', align: 'right', width: 44 },
  ],
  mobile: [
    { key: 'label', label: 'Label', flex: 1 },
    { key: 'uses', label: 'Uses', align: 'right', width: 72 },
    { key: 'disable', align: 'right', width: 44 },
  ],
}

/**
 * The state of a code as a glyph and a word. `code` is the code, which
 * names the state for Mokly.
 */
export function CodeStateText(props: { state: CodeState; code: string }) {
  const name = `state-${instanceKey(props.code)}`
  switch (props.state) {
    case 'active':
      return (
        <statusText.Component
          label={codeStateLabels.active}
          moklyInstance={name}
          tone="success"
        />
      )
    case 'used-up':
      return (
        <statusText.Component
          label={codeStateLabels.usedUp}
          moklyInstance={name}
          tone="muted"
        />
      )
    case 'disabled':
      return (
        <statusText.Component
          icon="ban"
          label={codeStateLabels.disabled}
          moklyInstance={name}
          tone="muted"
        />
      )
  }
}

/**
 * A code in the monospace font with Copy, and Copy join link while the
 * code still lets people in. The join link carries the code through the
 * sign-in, so a person does not type it.
 */
export function CopyableCode(props: { code: string; works: boolean }) {
  return (
    <span className={styles.codeCell}>
      <span className={styles.code}>{props.code}</span>
      <iconButton.Component
        icon="copy"
        label={copyLabels.code(props.code)}
        moklyInstance={`copy-${instanceKey(props.code)}`}
        quiet
      />
      {props.works ? (
        <iconButton.Component
          icon="link"
          label={copyLabels.joinLink(props.code)}
          moklyInstance={`copy-link-${instanceKey(props.code)}`}
          quiet
        />
      ) : null}
    </span>
  )
}

/** The name of a code in a question or a button: its label, or its owner. */
function codeName(row: CodeRow): string {
  return row.kind === 'invite' ? row.label : referralCodeName(row.owner)
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
 * phone gives the code with its copy buttons under the label, and keeps
 * the origin only for a referral code, whose owner it names.
 */
function LabelCell(props: { row: CodeRow; viewport: Viewport }) {
  const { row } = props
  const mobile = props.viewport === 'mobile'
  return (
    <span className={styles.labelCell}>
      <span className={styles.label}>
        {row.kind === 'invite' ? row.label : referralCodeLabel}
      </span>
      {mobile ? (
        <CopyableCode code={row.code} works={codeState(row) === 'active'} />
      ) : null}
      {mobile && row.kind === 'invite' ? null : (
        <span className={styles.origin}>
          <Origin row={row} />
        </span>
      )}
    </span>
  )
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
    <iconButton.Component
      icon="ban"
      label={disableLabel(codeName(row))}
      moklyInstance={`disable-${instanceKey(row.code)}`}
      quiet
    />
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
          <CopyableCode code={row.code} works={codeState(row) === 'active'} />
        )
      case 'uses':
        if (viewport === 'desktop') return <TableCell numeric>{uses}</TableCell>
        return (
          <span className={styles.usesCell}>
            <span className={styles.uses}>{uses}</span>
            <CodeStateText code={row.code} state={codeState(row)} />
          </span>
        )
      case 'state':
        return <CodeStateText code={row.code} state={codeState(row)} />
      default:
        return <DisableButton row={row} />
    }
  }
}
