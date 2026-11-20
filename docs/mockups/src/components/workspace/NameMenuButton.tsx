import type { RefCallback } from 'react'
import { Button } from '@firna/ui/button'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import styles from './WorkspaceHeader.module.css'

/**
 * The name of the open workspace in its header, as a plain button that
 * opens the workspace menu below it. It looks like the name: it has no
 * caret, and only a hover or a press shows that it is a button. Its text
 * ends with an ellipsis when the header has no room for it. Its name is the
 * name of the workspace, so the heading keeps that name, and its popup
 * says that it opens a menu.
 */
export function NameMenuButton(props: {
  name: string
  /** The workspace menu is open. */
  open?: boolean
  onPress?: () => void
  /** A pointer press on the name starts, before its click. */
  onPointerDown?: () => void
  /** Gets the element of the button, which places the menu below it. */
  buttonRef?: RefCallback<unknown>
}) {
  const control = useControlSizes()
  return (
    <h1 className={styles.titleHeading} onPointerDown={props.onPointerDown}>
      <Button
        accessibilityLabel={props.name}
        buttonRef={props.buttonRef}
        content={<span className={styles.title}>{props.name}</span>}
        expanded={props.open ?? false}
        hasPopup="menu"
        onPress={props.onPress ?? noop}
        size="sm"
        style={{
          height: control.height,
          maxWidth: '100%',
          paddingHorizontal: 6,
        }}
        tone="plain"
      />
    </h1>
  )
}
