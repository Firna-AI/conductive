import { useEffect, useRef } from 'react'
import { useToast } from '@firna/ui/toast'
import type { TerminalEntry } from '../shared/terminal'
import type { ReadyTerminalsAction } from './readyTerminals'
import { closeTerminal, openTerminal } from './terminalApi'
import { terminalCopy, terminalName } from './terminalCopy'
import type { TerminalRoute } from './terminalRoute'
import type { ToolRequests } from './tool-parts/workspace'

/** The writes of the terminal tabs. */
export interface TerminalActions {
  /** The +: opens a terminal, then shows it. */
  open: () => void
  /**
   * The + from outside the tool, such as New terminal of the command
   * palette: opens a terminal and shows it, then calls `shown`, so that
   * the owner can show the tool where another tool showed.
   */
  openThen: (shown: () => void) => void
  /** Closes a terminal after its question, which ends its shell. */
  close: (terminal: TerminalEntry) => void
}

/**
 * The writes of the terminal tabs. Each reply gives the tool its list and
 * the number of the event that holds that list. A new terminal shows once
 * it opened, while the list that shows still holds it: a newer change, such
 * as a close by another member, can remove it first. A failed write shows
 * the failure toast of the app with the message of the server, and the
 * terminals stay as they were, so the + and the close button stay in place
 * for the next try. A write that ends after the owner of the terminals
 * left, such as after a stop of the sandbox, does nothing more.
 */
export function useTerminalActions(
  workspace: ToolRequests,
  route: TerminalRoute,
  opening: boolean,
  dispatch: (action: ReadyTerminalsAction) => void,
  /** Whether the list that shows holds a terminal now. */
  listed: (terminalId: string) => boolean,
): TerminalActions {
  const { toast } = useToast()
  const mounted = useRef(false)
  /** The route of the last render, for a write that ends later. */
  const latestRoute = useRef(route)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    latestRoute.current = route
  })

  const openThen = (shown?: () => void) => {
    if (opening) return
    dispatch({ type: 'open' })
    void openTerminal(workspace).then((result) => {
      if (!mounted.current) return
      if (!result.ok) {
        dispatch({ type: 'open-failed' })
        toast({
          title: terminalCopy.openFailed,
          description: result.error.message,
          tone: 'error',
        })
        return
      }
      const { terminal } = result.value
      dispatch({ type: 'opened', ...result.value })
      if (!listed(terminal.id)) return
      latestRoute.current.show(terminal.id, 'push')
      shown?.()
    })
  }

  const close = (terminal: TerminalEntry) => {
    dispatch({ type: 'close', terminalId: terminal.id })
    void closeTerminal(workspace, terminal.id).then((result) => {
      if (!mounted.current) return
      if (result.ok) {
        dispatch({ type: 'closed', terminalId: terminal.id, ...result.value })
        return
      }
      dispatch({ type: 'close-failed', terminalId: terminal.id })
      toast({
        title: terminalCopy.closeFailed(terminalName(terminal)),
        description: result.error.message,
        tone: 'error',
      })
    })
  }

  return { open: () => openThen(), openThen, close }
}
