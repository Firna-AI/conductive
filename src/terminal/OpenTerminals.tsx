import { useEffect, useMemo, useState, type Ref } from 'react'
import { Unplug } from 'lucide-react'
import type { TerminalEntry } from '../shared/terminal'
import { CloseTerminalQuestion } from './CloseTerminalQuestion'
import type { ReadyTerminals, ReadyTerminalsAction } from './readyTerminals'
import type { ReadyTerminal } from './terminalApi'
import type { TerminalLinks } from './terminalLinks'
import { shownTerminal, type TerminalRoute } from './terminalRoute'
import { TerminalScreen, type ConnectTerminal } from './TerminalScreen'
import { TerminalTabs } from './TerminalTabs'
import { ToolButton } from './tool-parts/ToolButtons'
import type { TerminalActions } from './useTerminalActions'
import styles from './TerminalTool.module.css'

/** What the screen of each terminal takes from the owner of the tool. */
interface ScreenProps {
  connect: ConnectTerminal
  links?: TerminalLinks
  onActivity?: () => void
  screenRef?: Ref<HTMLDivElement>
}

/**
 * One terminal: its screen, and the Disconnected bar with Reconnect after
 * its connection ended. Reconnect opens a new connection of this terminal
 * only. A hidden terminal keeps its connection.
 */
function TerminalPane(
  props: ScreenProps & {
    terminal: TerminalEntry
    hidden: boolean
    ended: boolean
    /** The connection of the terminal. A new one mounts a new screen. */
    connection: number
    dispatch: (action: ReadyTerminalsAction) => void
  },
) {
  const { dispatch } = props
  const { id, socketPath } = props.terminal
  // The screen connects again only when its socket changes.
  const terminal = useMemo<ReadyTerminal>(
    () => ({ state: 'ready', socketPath, protocol: 'tty' }),
    [socketPath],
  )
  return (
    <div className={styles.pane} hidden={props.hidden}>
      <TerminalScreen
        connect={props.connect}
        ended={props.ended}
        key={props.connection}
        links={props.links}
        onClosed={() => dispatch({ type: 'ended', terminalId: id })}
        onInput={props.onActivity}
        screenRef={props.screenRef}
        terminal={terminal}
      />
      {props.ended ? (
        <div className={styles.ended} role="status">
          <span className={styles.endedLabel}>
            <Unplug aria-hidden size={13} />
            Disconnected
          </span>
          <ToolButton
            onPress={() => dispatch({ type: 'reconnect', terminalId: id })}
          >
            Reconnect
          </ToolButton>
        </div>
      ) : null}
    </div>
  )
}

/**
 * The terminals of a ready workspace: the row of tabs, the screen of each
 * terminal that the user showed, and the question before a close. The +
 * and the close run the actions of the owner of the terminals. The route
 * names the shown terminal. When the shown terminal closes, also for
 * another member, the terminal before it shows, and the route follows it.
 * Each terminal that the user showed stays mounted and connected while
 * another one shows. A terminal that the user never showed opens no
 * connection. Older software opens one shell, so the tool shows the first
 * terminal, with no row.
 */
export function OpenTerminals(
  props: ScreenProps & {
    ready: ReadyTerminals
    dispatch: (action: ReadyTerminalsAction) => void
    actions: TerminalActions
    route: TerminalRoute
  },
) {
  const { ready, dispatch, actions, route } = props
  const terminals = ready.several
    ? ready.terminals
    : ready.terminals.slice(0, 1)
  const shown = shownTerminal(terminals, ready.replaced, route)
  const { terminal, requested, follow } = shown
  const [asking, setAsking] = useState<TerminalEntry | null>(null)
  // The shell follows the shown terminal when the route names another one.
  useEffect(() => {
    if (follow) route.show(terminal.id, 'replace')
  }, [follow, route, terminal.id])
  // The store keeps the shown terminal, for the next close of that terminal.
  useEffect(() => {
    dispatch({ type: 'shown', terminalId: terminal.id, requested })
  }, [dispatch, terminal.id, requested])
  // The question goes when its terminal closed, or when it is the last one.
  const question =
    asking !== null &&
    terminals.length > 1 &&
    terminals.some((each) => each.id === asking.id)
      ? asking
      : null
  const mounted = terminals.filter(
    (each) => each.id === terminal.id || ready.opened.has(each.id),
  )
  return (
    <>
      {ready.several ? (
        <TerminalTabs
          closing={ready.closing}
          href={route.href}
          onClose={setAsking}
          onOpen={actions.open}
          onSelect={(id) => {
            if (id !== terminal.id) route.show(id, 'push')
          }}
          opening={ready.opening}
          shown={terminal.id}
          terminals={terminals}
        />
      ) : null}
      {mounted.map((each) => (
        <TerminalPane
          connect={props.connect}
          connection={ready.connections.get(each.id) ?? 0}
          dispatch={dispatch}
          ended={ready.ended.has(each.id)}
          hidden={each.id !== terminal.id}
          key={each.id}
          links={props.links}
          onActivity={props.onActivity}
          screenRef={props.screenRef}
          terminal={each}
        />
      ))}
      {question ? (
        <CloseTerminalQuestion
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            setAsking(null)
            actions.close(question)
          }}
          terminal={question}
        />
      ) : null}
    </>
  )
}
