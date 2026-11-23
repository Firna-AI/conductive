import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { Plus, SquareTerminal, X } from 'lucide-react'
import { classes } from '../ui/components/common/classes'
import terminalTabs from '../ui/components/tools/TerminalTabs.module.css'
import tabScroll from '../ui/components/workspace/TabScroll.module.css'
import tabRow from '../ui/components/workspace/WorkspaceTabs.module.css'
import { useSidewaysWheel } from '../app/sideways-wheel'
import { useRowScroll } from '../chat/components/row-scroll'
import { TabNodes } from '../chat/components/tab-nodes'
import { TERMINAL_LIMIT, type TerminalEntry } from '../shared/terminal'
import { terminalCopy, terminalName } from './terminalCopy'
import { ToolIconButton } from './tool-parts/ToolButtons'
import { useTouch } from './tool-parts/ToolRoot'

/**
 * True for a plain left click. The browser keeps every other click, such as
 * Ctrl or middle click, which opens the address in a new tab.
 */
function plainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/** Whether the keyboard focus is on no control, as after its removal. */
function focusLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body || !active.isConnected
}

/**
 * After a close that the user confirmed, the question gives the focus back
 * to the close button of the tab, and that button goes away with its tab.
 * The focus then goes to the tab of the shown terminal. A close that failed
 * keeps its tab, so the focus stays on its close button. A focus that the
 * user moved to another control meanwhile stays there.
 */
function useFocusAfterClose(
  nodes: TabNodes,
  terminals: readonly TerminalEntry[],
  closing: ReadonlySet<string>,
  shown: string,
): void {
  const closingBefore = useRef(closing)
  useLayoutEffect(() => {
    const before = closingBefore.current
    closingBefore.current = closing
    const closed = [...before].some(
      (id) => !terminals.some((terminal) => terminal.id === id),
    )
    if (closed && focusLost()) nodes.focus(shown)
  })
}

/**
 * The row of terminal tabs, with the + for a new terminal at its end. The
 * tabs look like the tabs of the centre column, and each one is a link to
 * the address of its terminal. Each tab shows its whole name, also on a
 * phone, and a row that does not fit scrolls sideways, keeps the shown tab
 * in view, and fades each end that clips tabs. Each tab has a close button
 * while the workspace has more than one terminal. After a confirmed close,
 * the tab of the shown terminal takes the focus. At the limit, the + is
 * off and a line under the row says how to open another terminal.
 */
export function TerminalTabs(props: {
  terminals: readonly TerminalEntry[]
  /** The ID of the shown terminal. */
  shown: string
  href: (terminalId: string) => string
  /** A new terminal opens. */
  opening: boolean
  /** The terminals whose close runs. */
  closing: ReadonlySet<string>
  onSelect: (terminalId: string) => void
  onOpen: () => void
  onClose: (terminal: TerminalEntry) => void
}) {
  const { terminals, shown } = props
  const touch = useTouch()
  const row = useRef<HTMLUListElement>(null)
  const [nodes] = useState(() => new TabNodes())
  const fades = useRowScroll({
    row,
    nodes,
    keys: terminals.map((terminal) => terminal.id),
    kept: shown,
    moved: null,
  })
  useSidewaysWheel(row)
  useFocusAfterClose(nodes, terminals, props.closing, shown)
  const closable = terminals.length > 1
  const atLimit = terminals.length >= TERMINAL_LIMIT
  return (
    <div className={terminalTabs.terminals}>
      <nav
        aria-label="Terminals"
        className={classes(tabRow.bar, touch && tabRow.phone)}
      >
        <ul
          className={classes(
            tabRow.tabs,
            terminalTabs.whole,
            tabScroll.scroll,
            fades.start && tabScroll.fadeStart,
            fades.end && tabScroll.fadeEnd,
          )}
          ref={row}
        >
          {terminals.map((terminal) => {
            const selected = terminal.id === shown
            const name = terminalName(terminal)
            return (
              <li
                className={classes(
                  tabRow.tab,
                  selected && tabRow.selected,
                  !closable && tabRow.kept,
                )}
                key={terminal.id}
                ref={nodes.itemRef(terminal.id)}
              >
                <a
                  aria-current={selected ? 'page' : undefined}
                  className={tabRow.link}
                  href={props.href(terminal.id)}
                  onClick={(event) => {
                    if (!plainClick(event)) return
                    event.preventDefault()
                    props.onSelect(terminal.id)
                  }}
                  ref={nodes.linkRef(terminal.id)}
                >
                  <SquareTerminal
                    aria-hidden
                    className={tabRow.icon}
                    size={13}
                  />
                  <span className={tabRow.title}>{name}</span>
                </a>
                {closable ? (
                  <span className={tabRow.close}>
                    <ToolIconButton
                      busy={props.closing.has(terminal.id)}
                      icon={X}
                      label={`Close ${name}`}
                      onPress={() => props.onClose(terminal)}
                      quiet
                    />
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
        <ToolIconButton
          busy={props.opening}
          disabled={atLimit}
          icon={Plus}
          label={terminalCopy.newTerminal}
          onPress={props.onOpen}
        />
      </nav>
      {atLimit ? (
        <p className={terminalTabs.hint}>{terminalCopy.limit}</p>
      ) : null}
    </div>
  )
}
