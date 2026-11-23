import type { ReactNode } from 'react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import { favourites } from '../../fixtures/favourites'
import { menu } from '../../entries/components/common/Menu.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useShortcutHint } from '../common/ShortcutTip'
import { favouritesMenu } from './pickers'
import styles from './PlacedModelMenu.module.css'

/**
 * The open model menu of the picker in `PlacedModelAnchor`, drawn above the
 * page, as the app opens a menu in the top layer of the browser. So no box
 * that clips or scrolls cuts it. A view runs no script, so the screen draws
 * the menu outside every box, and CSS places it at the picker: on the side
 * of `placement` when it fits there, otherwise on the other side. The menu
 * lists the favourites of the viewer first. `sessionAgent` and `fastKey`
 * work as in `ModelPicker`, and a phone shows no key.
 */
export function PlacedModelMenu(props: {
  choice: AgentChoice
  placement: 'above' | 'below'
  sessionAgent?: AgentKey
  fastKey?: boolean
}) {
  const fastHint = useShortcutHint('fast-mode')
  return (
    <div className={classes(styles.placed, styles[props.placement])}>
      <menu.Component
        entries={favouritesMenu(props.choice, {
          favourites,
          sessionAgent: props.sessionAgent,
          fastKey: props.fastKey ? fastHint : undefined,
        })}
        label="Model and effort"
        moklyInstance="model-menu"
        placement="point"
      />
    </div>
  )
}

/**
 * The open model picker whose menu `PlacedModelMenu` draws. It names itself
 * as the anchor of that menu. The picker draws no menu of its own.
 */
export function PlacedModelAnchor(props: { children: ReactNode }) {
  return <span className={styles.anchor}>{props.children}</span>
}
