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
  /** Closes a terminal after its question, which ends its shell. */
  close: (terminal: TerminalEntry) => void
}

/**
 * The writes of the terminal tabs. A new terminal shows once it opened. A
 * failed write shows the failure toast of the app with the message of the
 * server, and the terminals stay as they were, so the + and the close
 * button stay in place for the next try. A write that ends after the tool
 * left does nothing more.
 */
export function useTerminalActions(
  workspace: ToolRequests,
  route: TerminalRoute,
  opening: boolean,
  dispatch: (action: ReadyTerminalsAction) => void,
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

  const open = () => {
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
      dispatch({ type: 'opened', terminal })
      latestRoute.current.show(terminal.id, 'push')
    })
  }

  const close = (terminal: TerminalEntry) => {
    dispatch({ type: 'close', terminalId: terminal.id })
    void closeTerminal(workspace, terminal.id).then((result) => {
      if (!mounted.current) return
      if (result.ok) {
        dispatch({ type: 'closed', terminalId: terminal.id })
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

  return { open, close }
}
