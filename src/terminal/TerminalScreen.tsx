import '@xterm/xterm/css/xterm.css'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { MouseEvent, Ref } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useSharedUiTheme } from '@firna/ui/theme'
import type { TerminalTransport } from '../shared/terminal'
import { ToolButton } from './tool-parts/ToolButtons'
import { useTouch } from './tool-parts/ToolRoot'
import type { ReadyTerminal } from './terminalApi'
import type { ExtraKey } from './terminalKeys'
import { TerminalSession } from './terminalSession'
import { cssTokens, terminalFont, terminalTheme } from './terminalTheme'
import { XtermScreen } from './xtermScreen'
import styles from './TerminalScreen.module.css'

/**
 * Opens the decoded transport of a ready terminal, such as the ttyd socket at
 * its `socketPath`. Keep the function stable across renders.
 */
export type ConnectTerminal = (terminal: ReadyTerminal) => TerminalTransport

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

function fitVisible(host: HTMLElement, fit: FitAddon): void {
  if (host.clientWidth > 0 && host.clientHeight > 0) fit.fit()
}

/**
 * The xterm.js screen of one terminal connection. It fits the terminal to its
 * box and sends each new size. On a phone it shows the key row.
 */
export function TerminalScreen(props: {
  terminal: ReadyTerminal
  connect: ConnectTerminal
  /** The connection ended, so the screen takes no more input. */
  ended: boolean
  onClosed: () => void
  onInput?: () => void
  /** The element of the xterm.js screen, without the key row. */
  screenRef?: Ref<HTMLDivElement>
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const sessionRef = useRef<TerminalSession | null>(null)
  const [control, setControl] = useState(false)
  const touch = useTouch()
  const { scheme } = useSharedUiTheme()
  const { terminal, connect, ended, screenRef } = props
  const onClosed = useEffectEvent(() => props.onClosed())
  const onInput = useEffectEvent(() => props.onInput?.())
  const currentTheme = useEffectEvent((host: Element) =>
    terminalTheme(cssTokens(host), scheme),
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    let transport: TerminalTransport
    try {
      transport = connect(terminal)
    } catch {
      // A transport that can't open shows as ended, with Reconnect.
      onClosed()
      return undefined
    }
    const xterm = new Terminal({
      ...terminalFont(cssTokens(host), host),
      theme: currentTheme(host),
      // Bold keeps its colour, as the bold prompt of the mockup does.
      drawBoldTextInBrightColors: false,
      minimumContrastRatio: 4.5,
    })
    const fit = new FitAddon()
    xterm.loadAddon(fit)
    xterm.open(host)
    fitVisible(host, fit)
    const screen = new XtermScreen(xterm)
    const session = new TerminalSession(screen, transport, {
      onClosed: () => onClosed(),
      onControlChange: setControl,
      onInput: () => onInput(),
    })
    session.start()
    const observer = new ResizeObserver(() => fitVisible(host, fit))
    observer.observe(host)
    xtermRef.current = xterm
    sessionRef.current = session
    return () => {
      observer.disconnect()
      session.dispose()
      screen.dispose()
      xterm.dispose()
      xtermRef.current = null
      sessionRef.current = null
    }
  }, [terminal, connect])

  useEffect(() => {
    const host = hostRef.current
    const xterm = xtermRef.current
    if (host && xterm) {
      xterm.options.theme = terminalTheme(cssTokens(host), scheme)
    }
  }, [scheme])

  useEffect(() => {
    const xterm = xtermRef.current
    if (xterm) xterm.options.disableStdin = ended
  }, [ended])

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
