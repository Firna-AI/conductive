import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { classes } from '../../../ui/components/common/classes'
import tabs from '../../../ui/components/common/LinkTabs.module.css'
import { PanelBar } from '../../../ui/components/workspace/PanelBar'
import panel from '../../../ui/components/workspace/ToolsPanel.module.css'
import { useServices } from '../../../app/services'
import { useStore } from '../../../app/store'
import { createTerminalConnector } from '../../../app/terminal-transport'
import { DesktopTool } from '../../../desktop/DesktopTool'
import { PreviewTool } from '../../../previews/PreviewTool'
import { useKeptPreviews } from '../previews/kept-previews'
import { PanelPreviews } from '../previews/PanelPreviews'
import { usePreviewServices } from '../previews/services/kept-services'
import type { ConnectTerminal } from '../../../terminal/TerminalScreen'
import {
  workspaceKey,
  type ToolWorkspace,
} from '../../../terminal/tool-parts/workspace'
import type { ShortcutCommandId } from '../../../shared/shortcut-commands'
import { useOrgServices } from '../../context'
import { useRightShown } from '../../layout/panels'
import { useShortcutTerminal } from '../../shortcuts/shortcut-context'
import { shortcutTip, useShortcutHint } from '../../shortcuts/shortcut-hints'
import type { WorkspaceContext } from '../features'
import { TerminalPart } from './TerminalPart'
import { useTerminalLinks } from './terminal-links'
import { useTerminalRoute } from './terminal-route'
import { offeredToolTabs, type ToolKey } from './tool-address'
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

/** The command of the keys of each tool tab, as the palette's Go to rows. */
const toolCommands: Readonly<Record<ToolKey, ShortcutCommandId | undefined>> = {
  terminal: 'go-to-terminal',
  preview: 'go-to-preview',
  desktop: undefined,
}

/**
 * A tab of the tools panel: a link to its tool. Its tooltip names the key
 * of its Go to command.
 */
function ToolTab(props: {
  navigation: ToolNavigation
  tool: ToolKey
  label: string
}) {
  const { navigation, tool } = props
  const selected = tool === navigation.tool
  const hint = useShortcutHint(toolCommands[tool])
  return (
    <a
      aria-current={selected ? 'page' : undefined}
      aria-keyshortcuts={hint?.aria}
      className={classes(tabs.tab, selected && tabs.selected)}
      href={navigation.href(tool)}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        navigation.select(tool)
      }}
      title={shortcutTip(props.label, hint)}
    >
      {props.label}
    </a>
  )
}

/** The tabs of the tools panel. Each tab is a link to its tool. */
function ToolTabs(props: { navigation: ToolNavigation }) {
  return (
    <nav aria-label="Tools" className={tabs.tabs}>
      {offeredToolTabs.map((tab) => (
        <ToolTab
          key={tab.tool}
          label={tab.label}
          navigation={props.navigation}
          tool={tab.tool}
        />
      ))}
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
 * True from the first render with `shown` on. A tool mounts at its first
 * show, then stays mounted and hidden while another tool shows.
 */
function useShownOnce(shown: boolean): boolean {
  const [once, setOnce] = useState(shown)
  if (shown && !once) setOnce(true)
  return once
}

/**
 * The tools of the workspace that the app offers, Terminal and Preview: a
 * panel with their tabs on desktop, and the page of one tool on a phone.
 * Each tool reads the routes through the fetch of the org, and the events
 * of the workspace in order. The terminal and Preview each stay mounted
 * after their first show, so the connections of the terminals and the page
 * in the preview frame of a phone stay while another tool shows. On
 * desktop, Preview is the list of ports: the pages show in the Preview tabs
 * of the centre row. Both read the kept previews of the screen. On desktop
 * the terminals of the workspace load while the sandbox runs, also before
 * the Terminal tool shows, so that the palette can offer New terminal, as
 * `TerminalPart` says. The address and the saved view name the shown
 * terminal, as `useTerminalRoute` says. The app hides Desktop and keeps its
 * mount for its return: it mounts at each show, so it reads a new desktop
 * address. A `placeholder`, such as the state of a sandbox that does not
 * run, takes the place of the tools: the tabs stay on desktop, and no tool
 * mounts.
 */
export function ToolsPart(props: {
  context: WorkspaceContext
  placeholder?: ReactNode
}) {
  const { context } = props
  const services = useOrgServices(context.org.id)
  const { now } = useServices()
  const navigation = useToolNavigation(context)
  const terminalRoute = useTerminalRoute(context)
  const connect = useTerminalConnect()
  const { org, workspace, toolEvents } = context
  const links = useTerminalLinks(org.id, workspace.id)
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
  const previews = useKeptPreviews(context)
  // The screen of the terminal keeps the keys that a program in it can
  // read. Its buttons, such as Reconnect, keep none.
  const terminal = useShortcutTerminal()
  const { tool } = navigation
  const terminalShown = useShownOnce(tool === 'terminal')
  const previewShown = useShownOnce(tool === 'preview')
  // The services read again on a timer only while Preview shows: the page
  // of a phone, or on desktop the tool in a right column that shows.
  const rightShown = useRightShown()
  const previewServices = usePreviewServices(
    context,
    tool === 'preview' && (touch || rightShown),
  )
  // A choice of Terminal on desktop moves the focus to the terminal, also
  // when the terminal connects later. A hidden terminal does not take it.
  const focusRequest = useStore(context.terminalFocus.request)
  // A phone offers no New terminal, so its terminals load at the first show.
  const body = props.placeholder ?? (
    <>
      {terminalShown || !touch ? (
        <TerminalPart
          connect={connect}
          context={context}
          focusRequest={tool === 'terminal' ? focusRequest : null}
          key={workspaceKey(toolWorkspace)}
          links={links}
          navigation={navigation}
          onFocusDone={context.terminalFocus.done}
          route={terminalRoute}
          screenRef={terminal}
          shown={terminalShown}
          touch={touch}
          workspace={toolWorkspace}
        />
      ) : null}
      {previewShown ? (
        <div className={styles.tool} hidden={tool !== 'preview'}>
          {touch ? (
            <PreviewTool
              now={now}
              route={navigation.preview}
              services={previewServices}
              store={previews}
              touch
              workspace={toolWorkspace}
            />
          ) : (
            <PanelPreviews context={context} services={previewServices} />
          )}
        </div>
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
