import { useCallback, useMemo, useRef, useState } from 'react'
import { domBackendCss } from '@firna/ui'
import { SharedUiThemeProvider } from '@firna/ui/theme'
import { ToastProvider } from '@firna/ui/toast'
import { themeFor, tokensCss } from '../../ui/theme'
import { DesktopTool } from '../../desktop/DesktopTool'
import { PreviewTool, type PreviewRoute } from '../../previews/PreviewTool'
import { FIRST_TERMINAL_ID, terminalPaths } from '../../shared/terminal'
import { OverlayHost } from '../../shell/ui/Overlay'
import { ViewportProvider } from '../../shell/ui/viewport'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { TerminalTool } from '../TerminalTool'
import type { TerminalLinks } from '../terminalLinks'
import type { ConnectTerminal } from '../TerminalScreen'
import type { ToolWorkspace } from '../tool-parts/workspace'
import { DevControls } from './DevControls'
import {
  createDevServer,
  devFetch,
  devSubscribe,
  devTools,
  type DevRequest,
} from './devServer'
import { DevHold, EchoTerminal } from './devTerminal'
import { devHref, go, useDevParams } from './devParams'
import { useDevTerminalRoute } from './devRoute'
import { closeDevTerminal, openDevTerminal } from './devTerminals'
import { mockupSessionOutput } from './mockupSession'
import styles from './ToolsDevPage.module.css'

const labels = { terminal: 'Terminal', preview: 'Preview', desktop: 'Desktop' }

/** The time of the fake events, so that the age of a notice reads as drawn. */
const devNow = () => FAKE_TIME

function lastOf<T>(list: readonly T[], item: T): readonly T[] {
  return [...list, item].slice(-50)
}

/** The ID of the terminal of a socket path, or its last part. */
function socketName(socketPath: string): string {
  return socketPath.split('/').at(-2) ?? socketPath
}

/**
 * A development page for the three tools against the fake API. The panel
 * layout matches the tools of the right column, and the phone layout the
 * tool page of a phone. It is not part of the app.
 */
export function ToolsDevPage() {
  const params = useDevParams()
  const [requests, setRequests] = useState<readonly DevRequest[]>([])
  const [terminalLog, setTerminalLog] = useState<readonly string[]>([])
  const [activity, setActivity] = useState(0)
  /** The newest transport of each socket path. */
  const terminals = useRef(new Map<string, EchoTerminal>())
  const { server, hold } = useMemo(
    () => ({
      server: createDevServer(params.tool, params.state, params.ports),
      hold: new DevHold(params.state === 'late'),
    }),
    [params.tool, params.state, params.ports],
  )
  const workspace = useMemo<ToolWorkspace>(
    () => ({
      orgId: FAKE_IDS.org,
      workspaceId: params.workspace,
      fetch: devFetch(
        server,
        (request) => setRequests((list) => lastOf(list, request)),
        hold,
        params.state === 'failing',
      ),
      subscribe: devSubscribe(server),
    }),
    [server, hold, params.workspace, params.state],
  )
  const terminalRoute = useDevTerminalRoute(params)
  const connect = useCallback<ConnectTerminal>((socketPath) => {
    const name = socketName(socketPath)
    const terminal = new EchoTerminal((entry) =>
      setTerminalLog((list) => lastOf(list, `${name}: ${entry}`)),
    )
    terminals.current.set(socketPath, terminal)
    setTerminalLog((list) => lastOf(list, `${name}: connect`))
    // After the recorded output, draw the mockup's log to compare the look,
    // then the terminal of the connection.
    queueMicrotask(() =>
      terminal.emit(
        `${mockupSessionOutput}\x1b[90m# terminal ${name}\x1b[0m\r\n`,
      ),
    )
    return terminal
  }, [])
  /** The transport of the terminal that the page names, else of the first. */
  const shownTransport = () => {
    const id = params.terminal ?? terminalRoute.saved ?? FIRST_TERMINAL_ID
    const path = terminalPaths.terminalSocket(
      FAKE_IDS.org,
      params.workspace,
      id,
    )
    return terminals.current.get(path) ?? [...terminals.current.values()].at(-1)
  }
  // The page lists each link that opens, in place of opening it.
  const links = useMemo<TerminalLinks>(
    () => ({
      context: { appOrigin: window.location.origin, isAppPage: () => true },
      open: (link) =>
        setTerminalLog((list) => lastOf(list, `open ${JSON.stringify(link)}`)),
    }),
    [],
  )
  // The page names no port, so the tool never replaces its address.
  const route = useMemo<PreviewRoute>(
    () => ({
      previewId: params.preview,
      port: null,
      href: (preview) => devHref(params, { preview }),
      navigate: (preview) => go(devHref(params, { preview })),
      replace: (preview) => go(devHref(params, { preview })),
    }),
    [params],
  )
  const theme = useMemo(() => themeFor(params.scheme), [params.scheme])
  const touch = params.layout === 'phone'
  const tools = {
    terminal: (
      <TerminalTool
        connect={connect}
        links={links}
        onActivity={() => setActivity((count) => count + 1)}
        route={terminalRoute}
        touch={touch}
        workspace={workspace}
      />
    ),
    preview: (
      <PreviewTool
        now={devNow}
        route={route}
        touch={touch}
        workspace={workspace}
      />
    ),
    desktop: <DesktopTool touch={touch} workspace={workspace} />,
  }
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: domBackendCss }} />
      <style dangerouslySetInnerHTML={{ __html: tokensCss(params.scheme) }} />
      <SharedUiThemeProvider theme={theme}>
        <ToastProvider placement="bottom-right">
          <div className={styles.page}>
            <DevControls
              hold={hold}
              onCloseElsewhere={() =>
                void closeDevTerminal(
                  server,
                  params.terminal ?? terminalRoute.saved,
                )
              }
              onDisconnect={() => shownTransport()?.close()}
              onOpenElsewhere={() => openDevTerminal(server)}
              onTerminalOutput={(output) => shownTransport()?.emit(output)}
              params={params}
              server={server}
            />
            <div className={styles.stage}>
              <ViewportProvider viewport={touch ? 'phone' : 'desktop'}>
                <section
                  aria-label="Tools"
                  className={touch ? styles.phone : styles.panel}
                >
                  <OverlayHost>
                    {touch ? null : (
                      <nav aria-label="Tools" className={styles.tabs}>
                        {devTools.map((tool) => (
                          <a
                            aria-current={
                              tool === params.tool ? 'page' : undefined
                            }
                            className={styles.tab}
                            href={devHref(params, {
                              tool,
                              state: null,
                              terminal: null,
                            })}
                            key={tool}
                          >
                            {labels[tool]}
                          </a>
                        ))}
                      </nav>
                    )}
                    <div className={styles.body}>{tools[params.tool]}</div>
                  </OverlayHost>
                </section>
              </ViewportProvider>
              <div className={styles.log}>
                <h2>Requests</h2>
                <ol aria-label="Requests">
                  {requests.map((request, index) => (
                    <li key={index}>
                      {request.method} {request.path} {request.status}{' '}
                      {request.body}
                    </li>
                  ))}
                </ol>
                <h2>Terminal transport</h2>
                <p>Input events: {activity}</p>
                <ol aria-label="Terminal transport">
                  {terminalLog.map((entry, index) => (
                    <li key={index}>{entry}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </ToastProvider>
      </SharedUiThemeProvider>
    </>
  )
}
