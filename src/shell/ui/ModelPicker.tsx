import type { AgentModel } from '../../shared/generated/AgentModel'
import type { RefCallback } from 'react'
import { Button } from '@firna/ui/button'
import { ChevronDown } from 'lucide-react'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { MenuPlacement } from '../../ui/components/common/Menu'
import { useControlSizes } from '../../ui/components/common/touch'
import { pickerButtonStyle } from '../../ui/components/chat/pickerButton'
import styles from '../../ui/components/chat/ModelPicker.module.css'
import {
  modelMenuRows,
  type ModelMenuRow,
  type ModelRow,
} from '../../chat/components/model-rows'
import { fastFor } from '../../chat/state/format'
import { effortLabels, findModel, modelLabel } from '../../shared/agents'
import { MenuButton, type MenuEntry, type MenuRow } from './Menu'

/**
 * The entry of one row of the model menu. A pick of a choice sends its
 * choice through `change`, and the Fast switch turns fast mode on or off
 * and keeps the menu open. A shell picker has no session, so no row opens
 * a new session.
 */
function rowEntry(
  row: ModelRow,
  choice: AgentChoice,
  change: (choice: AgentChoice) => void,
): MenuRow {
  switch (row.kind) {
    case 'choice':
      return {
        kind: 'item',
        id: row.key,
        label: row.label,
        muted: row.muted,
        checked: row.checked,
        onSelect: () => change(row.choice),
      }
    case 'fast':
      return {
        kind: 'switch',
        label: row.label,
        on: row.on,
        onToggle: () => change({ ...choice, fast: !choice.fast }),
      }
    case 'label':
    case 'divider':
      return row
  }
}

/**
 * The entries of the menu, from the rows of `modelMenuRows`. All models
 * and Effort show their rows as the choices of their submenus.
 */
function menuEntries(
  rows: readonly ModelMenuRow[],
  choice: AgentChoice,
  change: (choice: AgentChoice) => void,
): MenuEntry[] {
  return rows.map((row): MenuEntry => {
    if (row.kind !== 'submenu') return rowEntry(row, choice, change)
    return {
      kind: 'submenu',
      id: row.key,
      label: row.label,
      muted: row.muted,
      entries: row.rows.map((item) => rowEntry(item, choice, change)),
    }
  })
}

/**
 * One picker for the model and the effort, such as "Opus 5.5 High", with
 * "Fast" after the effort while fast mode is on. It names no agent brand.
 * Its menu lists the favourites first, then All models, then Effort with
 * its submenu and the Fast switch, as `modelMenuRows` says. A pick of a favourite sets
 * its model, its effort, and its fast mode. The phone layout opens the menu
 * beside the picker too, as the picker of a session does (model favourites
 * decision 5 B). The picker shows fast mode as off for a model that the
 * model list does not mark as fast.
 */
export function ModelPicker(props: {
  models: readonly AgentModel[]
  choice: AgentChoice
  /**
   * The favourites of the account, in the order of the menu. The picker of
   * a Favourites row gives none, because the row sets one favourite.
   */
  favourites: readonly AgentChoice[]
  change: (choice: AgentChoice) => void
  placement?: Exclude<MenuPlacement, 'sheet'>
  /**
   * The picker takes no change, such as while one saves. The trigger and
   * the rows of an open menu are off, and an open menu stays open.
   */
  disabled?: boolean
  /** Takes the element of the trigger, for an owner that focuses it. */
  buttonRef?: RefCallback<unknown>
}) {
  const control = useControlSizes()
  const choice: AgentChoice = {
    ...props.choice,
    fast: fastFor(findModel(props.models, props.choice), props.choice.fast),
  }
  const model = modelLabel(props.models, choice)
  const effort = effortLabels[choice.effort]
  const rows = modelMenuRows(props.models, choice, {
    favourites: props.favourites,
  })
  return (
    <MenuButton
      besideOnPhone
      busy={props.disabled}
      className={styles.anchor}
      entries={menuEntries(rows, choice, props.change)}
      label="Model and effort"
      placement={props.placement ?? 'above-start'}
      trigger={({ open, toggle, busy }) => (
        <Button
          accessibilityLabel={`Model and effort: ${model}, ${effort}${choice.fast ? ', Fast' : ''}`}
          buttonRef={props.buttonRef}
          content={
            <span
              className={styles.trigger}
              style={{ fontSize: control.labelSize }}
            >
              <span className={styles.model}>{model}</span>
              <span className={styles.effort}>{effort}</span>
              {choice.fast ? <span className={styles.fast}>Fast</span> : null}
              <ChevronDown aria-hidden className={styles.chevron} size={12} />
            </span>
          }
          disabled={busy}
          expanded={open}
          hasPopup="menu"
          onPress={toggle}
          size="sm"
          style={pickerButtonStyle(control.height)}
          tone="plain"
        />
      )}
    />
  )
}
