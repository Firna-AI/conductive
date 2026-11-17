import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '../../../app/navigation'
import type { WorkspaceView } from '../../../shared/workspace-view'
import type { TerminalRoute } from '../../../terminal/terminalRoute'
import type { WorkspaceContext } from '../features'
import { useSavedView, useViewKnown } from '../saved-view'
import { shownTool, terminalHref, toolPlace } from './tool-address'

/** The view with this terminal shown in the Terminal tool. */
function withTerminal(
  terminalId: string,
): (view: WorkspaceView) => WorkspaceView {
  return (view) =>
    view.terminal === terminalId ? view : { ...view, terminal: terminalId }
}

/** The terminal that the user showed last, in the workspace of that show. */
interface Chosen {
  workspaceId: string
  terminalId: string
}

/**
 * The route of the Terminal tool: the terminal of the address, the shown
 * terminal of the saved view, and the show of a terminal. A show saves the
 * terminal in the view, once the chat read the view, and the terminal shows
 * at once also before that. From an address of the Terminal tool, the
 * address follows the terminal: a press on a tab adds an entry to the
 * history, and a terminal in the place of a closed one replaces the entry.
 * From another address, such as a session on desktop or the Preview tool,
 * the address stays.
 */
export function useTerminalRoute(context: WorkspaceContext): TerminalRoute {
  const navigation = useNavigation()
  const { org, workspace, savedView } = context
  const place = toolPlace(context.view)
  const follows = place !== null && shownTool(place.tool) === 'terminal'
  const terminalId = place?.terminalId ?? null
  const savedTerminal = useSavedView(savedView)?.terminal ?? null
  const known = useViewKnown(savedView)
  const [chosen, setChosen] = useState<Chosen | null>(null)
  const shown = chosen?.workspaceId === workspace.id ? chosen.terminalId : null
  useEffect(() => {
    if (known && shown !== null) savedView.updateView(withTerminal(shown))
  }, [known, shown, savedView])
  const href = useCallback(
    (id: string) => terminalHref(org.id, workspace.id, id),
    [org.id, workspace.id],
  )
  const show = useCallback(
    (id: string, entry: 'push' | 'replace') => {
      setChosen({ workspaceId: workspace.id, terminalId: id })
      if (!follows || id === terminalId) return
      if (entry === 'push') navigation.push(href(id))
      else navigation.replace(href(id))
    },
    [workspace.id, follows, terminalId, navigation, href],
  )
  return useMemo(
    () => ({ terminalId, saved: shown ?? savedTerminal, href, show }),
    [terminalId, shown, savedTerminal, href, show],
  )
}
