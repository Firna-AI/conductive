import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { iconButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { defined } from '../../defined'
import { tabItem } from '../../entries/components/workspace/TabItem.mockup'
import tabScroll from '../../../../../src/ui/components/workspace/TabScroll.module.css'
import tabRow from '../../../../../src/ui/components/workspace/WorkspaceTabs.module.css'
import styles from '../../../../../src/ui/components/tools/TerminalTabs.module.css'

/** The words under the row at the limit of 10 terminals. */
const terminalLimitHint =
  'A workspace holds up to 10 terminals. Close one to open another.'

/**
 * The terminals of a workspace, as a row of tabs above the shown terminal,
 * with + for a new terminal at its end. The tabs look like the tabs of the
 * centre column. Each terminal closes, except the last one. `atLimit` draws
 * the row at the limit of 10 terminals: the + is off, and a line under the
 * row says how to open another. A row whose tabs do not fit scrolls
 * sideways, and a view draws it scrolled to the shown tab. `closeTo` is the
 * screen that the close button of the shown terminal opens.
 */
export function TerminalTabs(props: {
  numbers: readonly number[]
  shown: number
  viewport: Viewport
  atLimit?: boolean
  closeTo?: string
}) {
  const phone = props.viewport === 'mobile'
  const atLimit = props.atLimit ?? false
  const endInView = atLimit && props.numbers.at(-1) === props.shown
  return (
    <div className={styles.terminals}>
      <nav
        aria-label="Terminals"
        className={classes(tabRow.bar, phone && tabRow.phone)}
      >
        <ul
          className={classes(
            tabRow.tabs,
            styles.whole,
            tabScroll.scroll,
            endInView && tabScroll.scrolledToEnd,
            atLimit && (endInView ? tabScroll.fadeStart : tabScroll.fadeEnd),
          )}
        >
          {props.numbers.map((number) => {
            const selected = number === props.shown
            return (
              <tabItem.Component
                closable={props.numbers.length > 1}
                key={number}
                moklyInstance={`terminal-${number}`}
                tab={{
                  key: `terminal-${number}`,
                  kind: 'terminal',
                  title: `Terminal ${number}`,
                  selected,
                }}
                {...defined({
                  closeTo: selected ? props.closeTo : undefined,
                })}
              />
            )
          })}
        </ul>
        <iconButton.Component
          disabled={atLimit}
          icon="plus"
          label="New terminal"
          moklyInstance="new-terminal"
        />
      </nav>
      {atLimit ? <p className={styles.hint}>{terminalLimitHint}</p> : null}
    </div>
  )
}
