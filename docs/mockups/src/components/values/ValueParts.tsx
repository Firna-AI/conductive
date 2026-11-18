import { Switch } from '@firna/ui/switch'
import { EyeOff, Power, ShieldCheck, type LucideIcon } from 'lucide-react'
import { noop } from '../../noop'
import { IconButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { StatusText } from '../common/StatusText'
import { useControlSizes } from '../common/touch'
import env from '../settings/EnvironmentSections.module.css'
import { hideWords, kindWords } from './valuesCopy'
import styles from './ValuesTab.module.css'

/** The kind of a value as an icon and a word, so it never depends on colour. */
export function KindText(props: { kind: 'start' | 'approval' }) {
  return (
    <StatusText
      icon={props.kind === 'start' ? Power : ShieldCheck}
      label={kindWords[props.kind]}
      tone="neutral"
    />
  )
}

/**
 * The mark Hide on screen of a value for each start, as a switch for an
 * admin, which saves at once. It was the Secret mark of an env var
 * (item 3 B), with the same shape and a new word.
 */
export function HideSwitch(props: { name: string; value: boolean }) {
  const { field } = useControlSizes()
  return (
    <span className={env.secret}>
      <Switch
        accessibilityLabel={`${hideWords.label}: ${props.name}`}
        onValueChange={noop}
        size={field === 'lg' ? 'md' : 'sm'}
        value={props.value}
      />
      <span aria-hidden>{hideWords.label}</span>
    </span>
  )
}

/** The mark Hide on screen without a control, for a person who may not change it. */
export function HideMark(props: { on: boolean }) {
  return (
    <span className={styles.mark}>
      {props.on ? (
        <StatusText icon={EyeOff} label={hideWords.label} tone="neutral" />
      ) : null}
    </span>
  )
}

/** An icon button of a row, as a link to its screen when the mockups draw one. */
export function RowAction(props: {
  icon: LucideIcon
  label: string
  to?: string
}) {
  const button = <IconButton icon={props.icon} label={props.label} />
  if (props.to === undefined) return button
  return (
    <ScreenLink asChild to={props.to}>
      {button}
    </ScreenLink>
  )
}
