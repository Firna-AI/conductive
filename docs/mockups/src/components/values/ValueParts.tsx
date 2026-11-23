import { Badge } from '@firna/ui/badge'
import { SegmentedControl } from '@firna/ui/segmented'
import { Switch } from '@firna/ui/switch'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { noop } from '../../../../../src/ui/noop'
import { valuesPaths } from '../../valuesPaths'
import {
  ActionButton,
  IconButton,
} from '../../../../../src/ui/components/common/actions'
import {
  Menu,
  type MenuEntry,
} from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { secretsWords } from '../../../../../src/ui/components/secrets/secretsCopy'
import secrets from '../../../../../src/ui/components/secrets/SecretsTab.module.css'
import { kindChoice, menuWords } from './valuesCopy'
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

/** Cancel, which closes a modal, and the action that saves. */
export function ModalActions(props: { save: string; icon?: LucideIcon }) {
  return (
    <>
      <ScreenLink asChild to={valuesPaths.list}>
        <ActionButton>{secretsWords.cancel}</ActionButton>
      </ScreenLink>
      <ActionButton icon={props.icon} tone="primary">
        {props.save}
      </ActionButton>
    </>
  )
}

/**
 * The type of a value, Secret or Env var, with the hint of the choice. Only
 * an admin sees it, because only an admin adds and changes env vars.
 */
export function KindField(props: { kind: 'env' | 'secret'; hint?: string }) {
  const { field } = useControlSizes()
  const hint =
    props.hint ??
    (props.kind === 'env' ? kindChoice.envHint : kindChoice.secretHint)
  return (
    <div className={styles.kind}>
      <span className={styles.kindLabel}>{kindChoice.label}</span>
      <SegmentedControl
        accessibilityLabel={kindChoice.label}
        onChange={noop}
        options={[
          { label: kindChoice.secret, value: 'secret' },
          { label: kindChoice.env, value: 'env' },
        ]}
        size={field}
        value={props.kind}
      />
      <span className={styles.hint}>{hint}</span>
    </div>
  )
}
