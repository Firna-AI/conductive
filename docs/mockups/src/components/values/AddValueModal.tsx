import { Input } from '@firna/ui/input'
import type { Viewport } from '@mokly/mokly'
import { Plus, X } from 'lucide-react'
import type { NewValue } from '../../fixtures/orgValues'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useControlSizes } from '../common/touch'
import { allAgentsHint, secretsWords } from '../secrets/secretsCopy'
import { KindField, ModalActions, SwitchField } from './ValueParts'
import { addWords } from './valuesCopy'
import styles from './ValuesTab.module.css'

/** One row of the modal: the name, the value, and Remove. */
function Row(props: { row: NewValue; index: number }) {
  const { field } = useControlSizes()
  const number = props.index + 1
  return (
    <div className={styles.addRow}>
      <Input
        accessibilityLabel={`${addWords.name} ${number}`}
        autoComplete="off"
        onChangeText={noop}
        placeholder="NAME"
        size={field}
        value={props.row.name}
      />
      <Input
        accessibilityLabel={`${addWords.value} ${number}`}
        autoComplete="off"
        onChangeText={noop}
        placeholder={addWords.value}
        secureTextEntry
        size={field}
        value={props.row.value}
      />
      <IconButton icon={X} label={addWords.removeRow(number)} quiet />
    </div>
  )
}

/**
 * The Add modal, for one value or many (Cal's review of 20 November 2026).
 * Each row is a name and a value. Lines of `NAME=value` pasted into a name
 * split into rows, so a `.env` file adds every value at once. An admin
 * first chooses the type, which applies to every row. A member adds only
 * secrets, so the modal of a member has no type. A secret gets its
 * description later, in its Edit modal. An admin also sets the mark for
 * all agents of the new secrets, which starts off. New env vars start
 * hidden on screen (decision 133).
 */
export function AddValueModal(props: {
  viewport: Viewport
  org: string
  admin: boolean
  kind: 'env' | 'secret'
  rows: readonly NewValue[]
}) {
  const env = props.admin && props.kind === 'env'
  const filled = props.rows.filter((row) => row.name !== '').length
  return (
    <ConfirmDialog
      actions={
        <ModalActions icon={Plus} save={addWords.save(Math.max(filled, 1))} />
      }
      title={env ? addWords.envTitle : addWords.secretTitle}
      viewport={props.viewport}
      wide
    >
      <div className={styles.fields}>
        {props.admin ? <KindField kind={props.kind} /> : null}
        <div className={styles.rows}>
          <div aria-hidden className={styles.addRow}>
            <span className={styles.kindLabel}>{addWords.name}</span>
            <span className={styles.kindLabel}>{addWords.value}</span>
          </div>
          {props.rows.map((row, index) => (
            <Row index={index} key={`${index} ${row.name}`} row={row} />
          ))}
          <span>
            <ActionButton icon={Plus}>{addWords.addRow}</ActionButton>
          </span>
          <span className={styles.hint}>{addWords.pasteHint}</span>
        </div>
        {props.admin && !env ? (
          <SwitchField
            hint={allAgentsHint(props.org)}
            label={secretsWords.allAgents}
            value={false}
          />
        ) : null}
      </div>
    </ConfirmDialog>
  )
}
