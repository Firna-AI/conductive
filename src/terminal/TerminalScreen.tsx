import '@xterm/xterm/css/xterm.css'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { MouseEvent, Ref } from 'react'
import type { Terminal } from '@xterm/xterm'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { TerminalEnd, TerminalTransport } from '../shared/terminal'
import { ToolButton } from './tool-parts/ToolButtons'
import { useTouch } from './tool-parts/ToolRoot'
import type { ExtraKey } from './terminalKeys'
import type { TerminalLinks } from './terminalLinks'
import { focusUnmoved, type TerminalFocusRequest } from './terminalFocus'
import type { TerminalSession } from './terminalSession'
import { cssTokens, terminalTheme } from './terminalTheme'
import { connectScreen, openScreen, type ScreenParts } from './screenConnection'
import styles from './TerminalScreen.module.css'

/**
 * Opens the decoded transport of one terminal at its socket path, such as
 * the ttyd socket of the terminal. Keep the function stable across renders.
 */
export type ConnectTerminal = (socketPath: string) => TerminalTransport

type RowKey = ExtraKey | 'control'

/** The keys that a phone keyboard lacks, in the order of the mockup. */
const rowKeys: readonly { key: RowKey; label: string; name: string }[] = [
  { key: 'escape', label: 'Esc', name: 'Escape' },
  { key: 'tab', label: 'Tab', name: 'Tab' },
  { key: 'control', label: 'Ctrl', name: 'Control' },
  { key: 'up', label: '↑', name: 'Up arrow' },
  { key: 'down', label: '↓', name: 'Down arrow' },
]

/** Keeps the keyboard focus, and so a phone keyboard, on the terminal. */
function keepFocus(event: MouseEvent) {
  event.preventDefault()
}

/**
 * The xterm.js screen of one terminal, and its connection. Each new
 * `connection` opens a new socket on the same screen, as
 * `connectScreen` of `screenConnection.ts` says. On a phone it shows the
 * key row.
 */
export function TerminalScreen(props: {
  /** The socket path of the terminal. A new path opens a new screen. */
  socketPath: string
  /** The connection of the terminal. A new one opens a new socket. */
  connection: number
  connect: ConnectTerminal
  /** The connection ended, so the screen takes no more input. */
  ended: boolean
  /**
   * The connection ended `lasted` milliseconds after its first output, or
   * with no output, as 0.
   */
  onClosed: (end: TerminalEnd, lasted: number) => void
  onInput?: () => void
  /** The element of the xterm.js screen, without the key row. */
  screenRef?: Ref<HTMLDivElement>
  /** Opens the links of the output. Without it, no link opens. */
  links?: TerminalLinks
  /** Moves the keyboard focus to the screen once the screen exists. */
  focusRequest?: TerminalFocusRequest | null
  /** The screen took the focus request, or dropped it after a focus move. */
  onFocusDone?: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const sessionRef = useRef<TerminalSession | null>(null)
  const partsRef = useRef<ScreenParts | null>(null)
  const connectionRef = useRef<{ dispose(): void } | null>(null)
  const [control, setControl] = useState(false)
  const touch = useTouch()
  const { scheme } = useSharedUiTheme()
  const { socketPath, connect, ended, screenRef } = props
  const onClosed = useEffectEvent((end: TerminalEnd, lasted: number) =>
    props.onClosed(end, lasted),
  )
  const onInput = useEffectEvent(() => props.onInput?.())
  const currentLinks = useEffectEvent(() => props.links)
  const currentTheme = useEffectEvent((host: Element) =>
    terminalTheme(cssTokens(host), scheme),
  )
  // A request waits for the screen. StrictMode makes a second screen at
  // once, and the request then still holds, so that screen takes it too.
  const takeFocus = useEffectEvent(() => {
    const request = props.focusRequest
    const xterm = xtermRef.current
    if (!request || !xterm) return
    if (focusUnmoved(request)) xterm.focus()
    props.onFocusDone?.()
  })

  // The screen outlives each connection, so a Reconnect and the automatic
  // try keep its output until the new connection shows its own. The first
  // connection that opens makes it.
  useEffect(
    () => () => {
      connectionRef.current?.dispose()
      connectionRef.current = null
      sessionRef.current = null
      partsRef.current?.dispose()
      partsRef.current = null
      xtermRef.current = null
    },
    [socketPath],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let transport: TerminalTransport
    try {
      transport = connect(socketPath)
    } catch {
      // A transport that can't open shows as ended, with Reconnect. A retry
      // can't open it either.
      onClosed('closed', 0)
      return undefined
    }
    const parts =
      partsRef.current ??
      openScreen(host, currentTheme(host), {
        links: () => currentLinks(),
        hintClass: styles.linkHint,
      })
    partsRef.current = parts
    xtermRef.current = parts.xterm
    const connection = connectScreen(parts, host, transport, {
      onClosed: (end, lasted) => onClosed(end, lasted),
      onControlChange: setControl,
      onInput: () => onInput(),
    })
    connectionRef.current = connection
    sessionRef.current = connection.session
    takeFocus()
    return () => {
      connection.dispose()
      if (connectionRef.current === connection) {
        connectionRef.current = null
        sessionRef.current = null
      }
    }
  }, [socketPath, connect, props.connection])

  useEffect(() => {
    const host = hostRef.current
    const xterm = xtermRef.current
    if (host && xterm) {
      xterm.options.theme = terminalTheme(cssTokens(host), scheme)
      // The bridge answers the colour queries of programs with these colours.
      sessionRef.current?.coloursChanged()
    }
  }, [scheme])

  useEffect(() => {
    const xterm = xtermRef.current
    if (xterm) xterm.options.disableStdin = ended
  }, [ended])

  useEffect(() => takeFocus(), [props.focusRequest])

  const press = (key: RowKey) => {
    const session = sessionRef.current
    if (key === 'control') session?.toggleControl()
    else session?.pressKey(key)
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.screen} ref={screenRef}>
        <div className={styles.host} ref={hostRef} />
      </div>
      {touch && !ended ? (
        <div
          aria-label="Terminal keys"
          className={styles.keys}
          onMouseDown={keepFocus}
          role="group"
        >
          {rowKeys.map((row) => {
            const held = row.key === 'control' && control
            return (
              <ToolButton
                accessibilityLabel={row.name}
                key={row.key}
                onPress={() => press(row.key)}
                pressed={row.key === 'control' ? control : undefined}
                tone={held ? 'primary' : 'secondary'}
              >
                {row.label}
              </ToolButton>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
