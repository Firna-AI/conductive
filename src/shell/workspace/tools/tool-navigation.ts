import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '../../../app/navigation'
import type { PreviewRoute } from '../../../previews/PreviewTool'
import type { WorkspaceView } from '../../../shared/workspace-view'
import type { WorkspaceContext } from '../features'
import { saveView, useSavedView, useViewKnown } from '../saved-view'
import { toolHref, toolPlace, type ToolKey } from './tool-address'

/** The view with this tool in the tools panel. */
function withTool(tool: ToolKey): (view: WorkspaceView) => WorkspaceView {
  return (view) => (view.tool === tool ? view : { ...view, tool })
}

export interface ToolNavigation {
  /** The tool that shows. */
  tool: ToolKey
  /** The address of a tool, for its tab. */
  href: (tool: ToolKey) => string
  /** Shows a tool after a plain click on its tab. */
  select: (tool: ToolKey) => void
  /** The route of the Preview tool: its preview, and the address of each. */
  preview: PreviewRoute
}

/**
 * The address of each tool, and the select of its tab: it saves the tool
 * in the view. On a phone it opens the page of the tool. On desktop it
 * moves the address only from the address of a tool.
 */
export function useToolSelect(
  context: WorkspaceContext,
): Pick<ToolNavigation, 'href' | 'select'> {
  const navigation = useNavigation()
  const { org, workspace, viewport, savedView } = context
  const placeTool = toolPlace(context.view)?.tool ?? null
  const phone = viewport === 'phone'
  const href = useCallback(
    (tool: ToolKey) => toolHref(org.id, workspace.id, tool),
    [org.id, workspace.id],
  )
  const select = useCallback(
    (tool: ToolKey) => {
      saveView(savedView, withTool(tool))
      if (phone) navigation.push(href(tool))
      else if (placeTool) navigation.replace(href(tool))
    },
    [savedView, phone, navigation, href, placeTool],
  )
  return { href, select }
}

/**
 * The tool of the open workspace and its navigation. An address that names
 * a tool shows it, and saves it in the view. Without one, the saved view
 * names the tool. A click saves the tool. On a phone each tool is a page
 * with its own address. On desktop the tools belong to the right column,
 * so the address keeps the tab of the centre: only a tool address follows
 * the new tool, and a preview tab changes the address only from a preview
 * address.
 */
export function useToolNavigation(context: WorkspaceContext): ToolNavigation {
  const navigation = useNavigation()
  const { org, workspace, viewport, savedView } = context
  const place = toolPlace(context.view)
  const placeTool = place?.tool ?? null
  const placePreview = place?.previewId ?? null
  const saved = useSavedView(savedView)
  const known = useViewKnown(savedView)
  const [chosenPreview, setChosenPreview] = useState<string | null>(null)
  const phone = viewport === 'phone'
  useEffect(() => {
    if (known && placeTool) savedView.updateView(withTool(placeTool))
  }, [savedView, known, placeTool])
  const { href, select } = useToolSelect(context)
  const preview = useMemo<PreviewRoute>(() => {
    const previewHref = (id: string) =>
      toolHref(org.id, workspace.id, 'preview', id)
    return {
      previewId: placeTool === 'preview' ? placePreview : chosenPreview,
      href: previewHref,
      navigate: (id) => {
        if (phone || placeTool === 'preview') navigation.push(previewHref(id))
        else setChosenPreview(id)
      },
    }
  }, [
    org.id,
    workspace.id,
    placeTool,
    placePreview,
    chosenPreview,
    phone,
    navigation,
  ])
  return {
    tool: placeTool ?? saved?.tool ?? 'terminal',
    href,
    select,
    preview,
  }
}
