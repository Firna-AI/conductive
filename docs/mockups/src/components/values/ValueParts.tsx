import { Badge } from '@firna/ui/badge'
import { Switch } from '@firna/ui/switch'
import { MoreHorizontal } from 'lucide-react'
import { noop } from '../../noop'
import { IconButton } from '../common/actions'
import { Menu, type MenuEntry } from '../common/Menu'
import { useControlSizes } from '../common/touch'
import secrets from '../secrets/SecretsTab.module.css'
import { menuWords } from './valuesCopy'
import styles from './ValuesTab.module.css'

/** A small badge after the name of a value, such as Env or All agents. */
export function ValueBadge(props: { label: string; tone?: 'primary' }) {
  return (
    <Badge size="sm" tone={props.tone ?? 'neutral'}>
      {props.label}
    </Badge>
  )
}

/**
 * The "⋯" button of a row, which opens its menu. `open` draws the menu
 * under the button, at its end. A phone draws the open menu as a sheet,
 * which the screen places.
 */
export function RowMenuButton(props: {
  name: string
  entries: readonly MenuEntry[]
  open: boolean
}) {
  return (
    <span className={styles.more}>
      <IconButton
        expanded={props.open}
        icon={MoreHorizontal}
        label={menuWords.label(props.name)}
        menu
        quiet
      />
      {props.open ? (
        <Menu
          entries={props.entries}
          label={props.name}
          placement="below-end"
        />
      ) : null}
    </span>
  )
}

/** A switch of a modal, with its label and its hint. */
export function SwitchField(props: {
  label: string
  hint: string
  value: boolean
}) {
  const { field } = useControlSizes()
  return (
    <span className={secrets.switchField}>
      <Switch
        accessibilityLabel={props.label}
        onValueChange={noop}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.value}
      />
      <span className={secrets.switchText}>
        <span className={secrets.switchLabel}>{props.label}</span>
        <span className={secrets.switchHint}>{props.hint}</span>
      </span>
    </span>
  )
}
