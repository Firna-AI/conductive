import { useNavigation } from '../../../app/navigation'
import { routes } from '../../../app/router'
import type { TabDraw } from '../../../chat/components/tab-row'
import type { WorkspaceTab } from '../../../shared/workspace-view'
import { useShortcutOffer } from '../../shortcuts/shortcut-context'
import type { WorkspaceContext } from '../features'
import { saveView, useSavedView } from '../saved-view'
import { previewPortHref } from '../tools/tool-address'
import { PreviewTabItem } from './PreviewTabItem'
import {
  previewTabsOf,
  withoutPreviewTab,
  type PreviewTab as SavedPreviewTab,
} from './preview-place'

/**
 * A Preview tab of the saved view, at the place in the tab row that the
 * chat gives it. Close removes the tab, and ends no preview (decision 289).
 * Close of the shown tab shows the next Preview tab, else the one before,
 * else the chat with its session, as for a file tab. While the tab shows,
 * the key of Close tab closes it, as its Close does.
 */
export function PreviewTab(props: {
  context: WorkspaceContext
  tab: SavedPreviewTab
  label: string
  description: string | undefined
  /** The port whose Preview tab the address shows, or null. */
  shown: number | null
  draw: Extract<TabDraw, { kind: 'row' }>
}) {
  const { context, tab } = props
  const go = useNavigation()
  const tabs = previewTabsOf(useSavedView(context.savedView))
  const { org, workspace } = context
  const selected = props.shown === tab.port
  const close = () => {
    const index = tabs.findIndex((open) => open.port === tab.port)
    const rest = tabs.filter((open) => open.port !== tab.port)
    const next = selected
      ? (rest[Math.min(index, rest.length - 1)] ?? null)
      : null
    const sessionId = context.savedView.getSnapshot().activeSessionId
    const session: WorkspaceTab | null = sessionId
      ? { kind: 'session', sessionId }
      : null
    saveView(context.savedView, (view) =>
      withoutPreviewTab(view, tab.port, next ?? session),
    )
    if (!selected) return
    go.push(
      next
        ? previewPortHref(org.id, workspace.id, next.port)
        : routes.workspace(org.id, workspace.id),
    )
  }
  useShortcutOffer('close-tab', selected ? close : null)
  return (
    <PreviewTabItem
      close={props.draw.close}
      description={props.description}
      href={previewPortHref(org.id, workspace.id, tab.port)}
      item={props.draw.item}
      label={props.label}
      link={props.draw.link}
      onClose={close}
      selected={selected}
    />
  )
}
