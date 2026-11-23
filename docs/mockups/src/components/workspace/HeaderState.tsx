import { Button } from '@firna/ui/button'
import { ChevronDown, RotateCw } from 'lucide-react'
import type { ActivityStatus } from '../../../../../src/ui/components/workspaces/activityStatus'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import {
  Menu,
  type MenuEntry,
} from '../../../../../src/ui/components/common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { activityPresentation } from '../../../../../src/ui/components/workspaces/status'
import { statusGlyph } from '../../entries/components/workspaces/StatusGlyph.mockup'
import styles from '../../../../../src/ui/components/workspace/HeaderState.module.css'
import {
  restartableStates,
  restartCopy,
} from '../../../../../src/ui/components/workspace/restartCopy'

/** The menu of the header state: Restart, and a note on what it does. */
export function restartMenu(highlighted = false): MenuEntry[] {
  return [
    { kind: 'item', label: restartCopy.item, icon: RotateCw, highlighted },
    { kind: 'divider' },
    { kind: 'note', text: restartCopy.note },
  ]
}

/**
 * The state of the open workspace in its header. While the software of the
 * cloud computer runs, the state is a button that opens the menu with
 * Restart. `open` draws the menu below it, and a phone shows the menu as a
 * sheet instead. The other states, and a read-only workspace, show the
 * state as plain text.
 */
export function HeaderState(props: {
  status: ActivityStatus
  canRestart: boolean
  open?: boolean
  phone?: boolean
}) {
  const control = useControlSizes()
  const { label } = activityPresentation[props.status]
  const state = (
    <>
      <statusGlyph.Component status={props.status} />
      {label}
    </>
  )
  if (!props.canRestart || !restartableStates.has(props.status)) {
    return <span className={styles.state}>{state}</span>
  }
  const button = (
    <Button
      accessibilityLabel={`${label}. ${restartCopy.menuLabel} menu`}
      content={
        <span className={styles.state} style={{ fontSize: control.labelSize }}>
          {state}
          <ChevronDown aria-hidden className={styles.chevron} size={12} />
        </span>
      }
      expanded={props.open ?? false}
      hasPopup="menu"
      onPress={noop}
      size="sm"
      style={{ height: control.height, paddingHorizontal: 6 }}
      tone="plain"
    />
  )
  return (
    <span className={styles.anchor}>
      {props.open ? (
        button
      ) : (
        <ScreenLink asChild to={paths.restart}>
          {button}
        </ScreenLink>
      )}
      {props.open && !props.phone ? (
        <Menu
          entries={restartMenu(true)}
          label={restartCopy.menuLabel}
          placement="below-end"
        />
      ) : null}
    </span>
  )
}
