import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import type { FilesNavigation, FilesTarget } from '../navigation'
import { FilesLink } from './FilesLink'
import { useControlSizes } from './layout'
import styles from './actions.module.css'

/**
 * A compact labelled button: a Firna button in the dense control size, with
 * a lighter label than Firna's own sizes. On a phone it is 44 px high.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  icon?: LucideIcon
  tone?: 'primary' | 'secondary'
  busy?: boolean
}) {
  const control = useControlSizes()
  return (
    <Button
      busy={props.busy}
      icon={props.icon}
      labelStyle={{
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
        lineHeight: control.labelSize + 4,
      }}
      numberOfLines={1}
      onPress={props.onPress}
      size="sm"
      style={{ height: control.height, paddingHorizontal: 10 }}
      tone={props.tone ?? 'secondary'}
    >
      {props.children}
    </Button>
  )
}

/**
 * A link with the look of a secondary `ActionButton`, for an action that
 * opens another tab or list. On a phone it is 44 px high.
 */
export function ActionLink(props: {
  children: string
  to: FilesTarget
  navigation: FilesNavigation
}) {
  const control = useControlSizes()
  return (
    <FilesLink
      className={styles.link}
      navigation={props.navigation}
      style={{
        height: control.height,
        fontSize: control.labelSize,
        fontWeight: control.labelWeight,
      }}
      to={props.to}
    >
      {props.children}
    </FilesLink>
  )
}

/**
 * A compact icon-only button with a muted icon, for bars and headers. A
 * quiet button has a fainter, smaller icon. Without `onPress` it is
 * disabled. On a phone its box is 44 px.
 */
export function IconButton(props: {
  label: string
  icon: LucideIcon
  onPress?: () => void
  quiet?: boolean
  busy?: boolean
}) {
  const Icon = props.icon
  const control = useControlSizes()
  return (
    <Button
      accessibilityLabel={props.label}
      boxSize={control.height}
      busy={props.busy}
      disabled={!props.onPress}
      iconNode={
        <Icon
          className={props.quiet ? styles.quiet : styles.icon}
          size={props.quiet ? 14 : 15}
        />
      }
      onPress={props.onPress}
      shape="square"
      size="sm"
      tone="plain"
    />
  )
}
