import { useEffect, useRef, type Ref } from 'react'
import type { TerminalFocusRequest } from '../../../terminal/terminalFocus'
import type { TerminalLinks } from '../../../terminal/terminalLinks'
import type { TerminalRoute } from '../../../terminal/terminalRoute'
import type { ConnectTerminal } from '../../../terminal/TerminalScreen'
import { TerminalToolView } from '../../../terminal/TerminalTool'
import type { ToolWorkspace } from '../../../terminal/tool-parts/workspace'
import { useTerminals } from '../../../terminal/useTerminals'
import type { WorkspaceContext } from '../features'
import { useNewTerminalOffer } from '../WorkspacePaletteActions'
import type { ToolNavigation } from './tool-navigation'
import styles from './tools.module.css'

/**
 * The Terminal tool of the tools part, with the terminals of the workspace,
 * which it keeps while it is mounted, also before the tool shows. So the
 * command palette knows whether the + takes a press, and its New terminal
 * runs the + of the tool. Once the new terminal shows, New terminal also
 * shows the Terminal tool where another tool showed, and moves no focus.
 * The tool mounts at its first show, then stays mounted and hidden while
 * another tool shows. A focus request of the owner goes to the shown
 * terminal.
 */
export function TerminalPart(props: {
  context: WorkspaceContext
  workspace: ToolWorkspace
  route: TerminalRoute
  navigation: ToolNavigation
  /** The Terminal tool showed once, so it mounts. */
  shown: boolean
  connect: ConnectTerminal
  links: TerminalLinks
  screenRef: Ref<HTMLDivElement>
  touch: boolean
  /** Moves the keyboard focus to the shown terminal, while Terminal shows. */
  focusRequest: TerminalFocusRequest | null
  /** The terminal took the focus request, or dropped it. */
  onFocusDone: () => void
}) {
  const terminals = useTerminals(props.workspace, props.route)
  // The open of New terminal ends later, with the navigation of that time.
  const navigation = useRef(props.navigation)
  useEffect(() => {
    navigation.current = props.navigation
  })
  // The focus after an open waits for a decision of the user, so the
  // show of the tool asks for no focus, as the + asks for none.
  const showTool = () => {
    const { tool, select } = navigation.current
    if (tool !== 'terminal') select('terminal', { focus: false })
  }
  useNewTerminalOffer(
    props.context,
    terminals.canOpen ? () => terminals.actions.openThen(showTool) : null,
  )
  if (!props.shown) return null
  return (
    <div className={styles.tool} hidden={props.navigation.tool !== 'terminal'}>
      <TerminalToolView
        connect={props.connect}
        focusRequest={props.focusRequest}
        links={props.links}
        onFocusDone={props.onFocusDone}
        route={props.route}
        screenRef={props.screenRef}
        terminals={terminals}
        touch={props.touch}
      />
    </div>
  )
}
