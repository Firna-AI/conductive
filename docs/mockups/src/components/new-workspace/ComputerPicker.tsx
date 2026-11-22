import { ChevronDown, Cloud, Server } from 'lucide-react'
import { ActionButton, type ActionTone } from '../common/actions'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { computerChoiceWords } from '../own-computers/computerChoiceCopy'
import styles from './ComputerPicker.module.css'

/** A computer that the choice offers, as its menu lists it. */
export type ComputerOption = {
  name: string
  /** The cloud computer, or an own computer of the org. */
  own: boolean
  /** The muted detail, such as "2 of 4 running", "Full", or "Offline". */
  detail: string
  /** The computer of the form, which the menu checks. */
  checked: boolean
  /** A computer without a good build stays in its place, off. */
  disabled: boolean
}

/**
 * The menu of the computer choice: the cloud computer first, the default,
 * then the own computers of the org under their label.
 */
export function computerMenu(options: readonly ComputerOption[]): MenuEntry[] {
  const item = (option: ComputerOption): MenuEntry => ({
    kind: 'item',
    label: option.name,
    icon: option.own ? Server : Cloud,
    detail: option.detail,
    checked: option.checked,
    disabled: option.disabled,
  })
  const cloud = options.filter((option) => !option.own)
  const own = options.filter((option) => option.own)
  return [
    ...cloud.map(item),
    { kind: 'divider' },
    { kind: 'label', label: computerChoiceWords.ownGroup },
    ...own.map(item),
  ]
}

/**
 * The computer of a new workspace or of the runs of an automation, as a
 * compact picker in the look of the repository picker: the cloud icon or
 * the server icon, the name, and a chevron (own computer decision 3 A). It
 * shows only while the org has an own computer. `menu` draws the open menu
 * below it, on a computer. A phone opens the menu as a sheet, so
 * `expanded` holds without `menu`. `to` is the screen of the open menu,
 * which a press on the closed picker leads to, in the mockups.
 */
export function ComputerPicker(props: {
  name: string
  own: boolean
  expanded: boolean
  menu?: readonly MenuEntry[]
  tone?: ActionTone
  to?: string
}) {
  const button = (
    <ActionButton
      accessibilityLabel={computerChoiceWords.controlLabel(props.name)}
      expanded={props.expanded}
      icon={props.own ? Server : Cloud}
      menu
      tone={props.tone}
      trailing={
        <ChevronDown aria-hidden className={styles.chevron} size={13} />
      }
    >
      {props.name}
    </ActionButton>
  )
  return (
    <span className={styles.anchor}>
      {props.to && !props.expanded ? (
        <ScreenLink asChild to={props.to}>
          {button}
        </ScreenLink>
      ) : (
        button
      )}
      {props.menu ? (
        <Menu
          entries={props.menu}
          label={computerChoiceWords.control}
          placement="below-start"
        />
      ) : null}
    </span>
  )
}
