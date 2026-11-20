import { useCallback, useEffect, useMemo } from 'react'
import { useNavigation } from '../../../app/navigation'
import type { PreviewRoute } from '../../../previews/PreviewTool'
import type { WorkspaceView } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { saveView, useSavedView, useViewKnown } from '../saved-view'
import {
  shownTool,
  toolHref,
  panelToolPlace,
  toolOffered,
  type ToolKey,
} from './tool-address'

/** The view with this tool in the tools panel. */
function withTool(tool: ToolKey): (view: WorkspaceView) => WorkspaceView {
  return (view) => (view.tool === tool ? view : { ...view, tool })
}

export interface ToolNavigation {
  /** The tool that shows. */
  tool: ToolKey
  /** The address of a tool, for its tab. */
  href: (tool: ToolKey) => string
  /**
   * Shows a tool after a plain click on its tab, or Go to of the palette
   * or its key. On desktop, Terminal also takes the keyboard focus. With
   * `focus` false, Terminal leaves the focus request as it is, for New
   * terminal, which asks for the focus with the element of its own run.
   */
  select: (tool: ToolKey, options?: { focus?: boolean }) => void
  /**
   * The route of the Preview tool: the preview or the port of the address,
   * and the address of each preview.
   */
  preview: PreviewRoute
}

/**
 * The address of each tool, and the select of its tab: it saves the tool
 * in the view. On a phone it opens the page of the tool. On desktop it
 * moves the address only from the address of a tool, and a choice of
 * Terminal asks for the keyboard focus of the terminal.
 */
export function useToolSelect(
  context: WorkspaceContext,
): Pick<ToolNavigation, 'href' | 'select'> {
  const navigation = useNavigation()
  const { org, workspace, viewport, savedView, terminalFocus } = context
  const phone = viewport === 'phone'
  const placeTool = panelToolPlace(context.view, !phone)?.tool ?? null
  const href = useCallback(
    (tool: ToolKey) => toolHref(org.id, workspace.id, tool),
    [org.id, workspace.id],
  )
  const select = useCallback(
    (tool: ToolKey, options: { focus?: boolean } = {}) => {
      // On desktop a choice of Terminal moves the focus to it. A phone
      // keyboard would cover the page, so a phone moves no focus.
      if (tool !== 'terminal' || phone) terminalFocus.clear()
      else if (options.focus ?? true) terminalFocus.ask()
      saveView(savedView, withTool(tool))
      if (phone) navigation.push(href(tool))
      else if (placeTool) navigation.replace(href(tool))
    },
    [savedView, terminalFocus, phone, navigation, href, placeTool],
  )
  return { href, select }
}

/**
 * The tool of the open workspace and its navigation. An address that names
 * a tool shows it, and saves it in the view. Without one, the saved view
 * names the tool. An address or a saved view that names a hidden tool shows
 * Terminal, and saves nothing, so the saved view keeps the hidden tool. A
 * click saves the tool. On a phone each tool is a page with its own
 * address. On desktop the tools belong to the right column, so the address
 * keeps the tab of the centre: only a tool address follows the new tool.
 * The Preview page of a phone gets the port of an address, and replaces
 * that address once it shows the port. On desktop, the address of a port
 * shows its Preview tab in the centre.
 */
export function useToolNavigation(context: WorkspaceContext): ToolNavigation {
  const navigation = useNavigation()
  const { org, workspace, savedView } = context
  const place = panelToolPlace(context.view, context.viewport !== 'phone')
  const placeTool = place?.tool ?? null
  const placePreview = place?.previewId ?? null
  const placePort = place?.port ?? null
  const saved = useSavedView(savedView)
  const known = useViewKnown(savedView)
  useEffect(() => {
    // The address of a hidden tool must not replace the saved tool.
    if (known && placeTool && toolOffered(placeTool)) {
      savedView.updateView(withTool(placeTool))
    }
  }, [savedView, known, placeTool])
  const { href, select } = useToolSelect(context)
  const preview = useMemo<PreviewRoute>(() => {
    const previewHref = (id: string | null) =>
      id === null
        ? toolHref(org.id, workspace.id, 'preview')
        : toolHref(org.id, workspace.id, 'preview', id)
    // Only the Preview page of a phone reads this route. The desktop shows
    // each page in the Preview tab of its port.
    return {
      previewId: placeTool === 'preview' ? placePreview : null,
      port: placePort,
      href: previewHref,
      navigate: (id) => navigation.push(previewHref(id)),
      replace: (id) => navigation.replace(previewHref(id)),
    }
  }, [org.id, workspace.id, placeTool, placePreview, placePort, navigation])
  return {
    tool: shownTool(placeTool ?? saved?.tool ?? 'terminal'),
    href,
    select,
    preview,
  }
}
