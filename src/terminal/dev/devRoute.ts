import { useMemo, useState } from 'react'
import type { TerminalRoute } from '../terminalRoute'
import { devHref, go, replace, type DevParams } from './devParams'

/**
 * The route of the Terminal tool on the development page. The `terminal`
 * of the address names a terminal, as `terminal/<terminalId>` does in the
 * app, and the page keeps the saved terminal itself. A show moves the
 * address, as from an address of the Terminal tool in the app.
 */
export function useDevTerminalRoute(params: DevParams): TerminalRoute {
  const [saved, setSaved] = useState<string | null>(null)
  return useMemo<TerminalRoute>(
    () => ({
      terminalId: params.terminal,
      saved,
      href: (terminalId) => devHref(params, { terminal: terminalId }),
      show: (terminalId, entry) => {
        setSaved(terminalId)
        if (terminalId === params.terminal) return
        const href = devHref(params, { terminal: terminalId })
        if (entry === 'push') go(href)
        else replace(href)
      },
    }),
    [params, saved],
  )
}
