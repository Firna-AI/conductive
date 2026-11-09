import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { classes } from '../../../../docs/mockups/src/components/common/classes'
import tabs from '../../../../docs/mockups/src/components/common/LinkTabs.module.css'
import { PanelBar } from '../../../../docs/mockups/src/components/workspace/PanelBar'
import panel from '../../../../docs/mockups/src/components/workspace/ToolsPanel.module.css'
import { useServices } from '../../../app/services'
import { createTerminalConnector } from '../../../app/terminal-transport'
import { DesktopTool } from '../../../desktop/DesktopTool'
import { PreviewTool } from '../../../previews/PreviewTool'
import type { ConnectTerminal } from '../../../terminal/TerminalScreen'
import { TerminalTool } from '../../../terminal/TerminalTool'
import type { ToolWorkspace } from '../../../terminal/tool-parts/workspace'
import { useOrgServices } from '../../context'
import { usePaletteTerminal } from '../../palette/palette-context'
import type { WorkspaceContext } from '../features'
import { toolTabs } from './tool-address'
import { useToolNavigation, type ToolNavigation } from './tool-navigation'
import styles from './tools.module.css'

/** A plain left click, which the shell handles without a page load. */
function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/** The tabs of the tools panel. Each tab is a link to its tool. */
function ToolTabs(props: { navigation: ToolNavigation }) {
  const { navigation } = props
  return (
    <nav aria-label="Tools" className={tabs.tabs}>
      {toolTabs.map((tab) => {
        const selected = tab.tool === navigation.tool
        return (
          <a
            aria-current={selected ? 'page' : undefined}
            className={classes(tabs.tab, selected && tabs.selected)}
            href={navigation.href(tab.tool)}
            key={tab.tool}
            onClick={(event) => {
              if (!isPlainClick(event)) return
              event.preventDefault()
              navigation.select(tab.tool)
            }}
          >
            {tab.label}
          </a>
        )
      })}
    </nav>
  )
}

/** The connection of a terminal when the app has no terminal socket. */
const noTerminal: ConnectTerminal = () => {
  throw new Error('The app has no terminal socket.')
}

/**
 * The terminal connection over the sockets of the app. A source without a
 * terminal socket, as in the development fake, throws, so the terminal
 * shows Disconnected with Reconnect.
 */
function useTerminalConnect(): ConnectTerminal {
  const { openSocket } = useServices().events
  return useMemo(
    () => (openSocket ? createTerminalConnector(openSocket) : noTerminal),
    [openSocket],
  )
}

/**
 * The Terminal, Preview, and Desktop tools of the workspace: a panel with
 * their tabs on desktop, and the page of one tool on a phone. Each tool
 * reads the routes through the fetch of the org, and the events of the
 * workspace in order. The terminal stays mounted after its first show, so
 * its connection stays while another tool shows. The Desktop tool mounts
 * at each show, so it reads a new desktop address. A `placeholder`, such as
 * the state of a sandbox that does not run, takes the place of the tools:
 * the tabs stay on desktop, and no tool mounts.
 */
export function ToolsPart(props: {
  context: WorkspaceContext
  placeholder?: ReactNode
}) {
  const { context } = props
  const services = useOrgServices(context.org.id)
  const navigation = useToolNavigation(context)
  const connect = useTerminalConnect()
  const { org, workspace, toolEvents } = context
  const toolWorkspace = useMemo<ToolWorkspace>(
    () => ({
      orgId: org.id,
      workspaceId: workspace.id,
      fetch: services.api.fetch,
      subscribe: toolEvents,
    }),
    [org.id, workspace.id, services, toolEvents],
  )
  const touch = context.viewport === 'phone'
  // Ctrl+K in the terminal goes to its shell, not to the command palette.
  const terminal = usePaletteTerminal()
  const { tool } = navigation
  const [terminalShown, setTerminalShown] = useState(tool === 'terminal')
  if (tool === 'terminal' && !terminalShown) setTerminalShown(true)
  const body = props.placeholder ?? (
    <>
      {terminalShown ? (
        <div
          className={styles.tool}
          hidden={tool !== 'terminal'}
          ref={terminal}
        >
          <TerminalTool
            connect={connect}
            touch={touch}
            workspace={toolWorkspace}
          />
        </div>
      ) : null}
      {tool === 'preview' ? (
        <PreviewTool
          route={navigation.preview}
          touch={touch}
          workspace={toolWorkspace}
        />
      ) : null}
      {tool === 'desktop' ? (
        <DesktopTool touch={touch} workspace={toolWorkspace} />
      ) : null}
    </>
  )
  if (touch) return body
  return (
    <section aria-label="Tools" className={panel.panel}>
      <PanelBar>
        <ToolTabs navigation={navigation} />
      </PanelBar>
      <div className={panel.body}>{body}</div>
    </section>
  )
}
