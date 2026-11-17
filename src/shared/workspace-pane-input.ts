import type {
  TemporaryTab,
  WorkspacePane,
  WorkspaceTab,
  WorkspaceView,
} from './workspace-view'
import { tabKey } from './workspace-panes'

type TabReader = (value: unknown) => WorkspaceTab

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** An unreadable mark loses only the mark, including a mark of another pane's tab. */
function readTemporaryTab(
  value: unknown,
  tabs: readonly WorkspaceTab[],
): TemporaryTab | null {
  if (
    !isRecord(value) ||
    (value.kind !== 'file' && value.kind !== 'diff') ||
    typeof value.path !== 'string' ||
    !value.path
  )
    return null
  const mark: TemporaryTab = { kind: value.kind, path: value.path }
  return tabs.some((tab) => tabKey(tab) === tabKey(mark)) ? mark : null
}

function readPane(value: unknown, readTab: TabReader): WorkspacePane | null {
  if (!isRecord(value) || !Array.isArray(value.tabs)) return null
  try {
    const tabs = value.tabs.map((tab: unknown) => readTab(tab))
    const activeTab = value.activeTab === null ? null : readTab(value.activeTab)
    if (activeTab && !tabs.some((tab) => tabKey(tab) === tabKey(activeTab)))
      return null
    return {
      tabs,
      activeTab,
      temporaryTab: readTemporaryTab(value.temporaryTab, tabs),
    }
  } catch {
    return null
  }
}

/** Reads both wire generations. Bad panes lose the split, never the readable tabs. */
export function readWorkspacePanes(
  view: Record<string, unknown>,
  readTab: TabReader,
): Pick<WorkspaceView, 'panes' | 'focusedPane'> {
  const raw: readonly unknown[] = Array.isArray(view.panes) ? view.panes : []
  const panes = raw.map((pane) => readPane(pane, readTab))
  const first = panes[0]
  const second = panes[1]
  const keys = panes.flatMap((pane) => pane?.tabs.map(tabKey) ?? [])
  if (
    (raw.length === 1 || raw.length === 2) &&
    first &&
    (raw.length === 1 ||
      (second && first.tabs.length > 0 && second.tabs.length > 0)) &&
    new Set(keys).size === keys.length &&
    (view.focusedPane === 0 || (view.focusedPane === 1 && second))
  ) {
    return {
      panes: second ? [first, second] : [first],
      focusedPane: view.focusedPane,
    }
  }
  const legacy = !Object.hasOwn(view, 'panes')
  const candidates: readonly unknown[] = legacy
    ? Array.isArray(view.tabs)
      ? view.tabs
      : []
    : [
        ...(Array.isArray(view.tabs) ? view.tabs : []),
        ...raw.flatMap((pane) =>
          isRecord(pane) && Array.isArray(pane.tabs) ? pane.tabs : [],
        ),
      ]
  const tabs: WorkspaceTab[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    try {
      const tab = readTab(candidate)
      const key = tabKey(tab)
      if (!seen.has(key)) tabs.push(tab)
      seen.add(key)
    } catch (error) {
      if (legacy) throw error
    }
  }
  let activeTab: WorkspaceTab | null
  try {
    activeTab = view.activeTab === null ? null : readTab(view.activeTab)
  } catch (error) {
    if (legacy) throw error
    activeTab = tabs[0] ?? null
  }
  if (!legacy && activeTab && !seen.has(tabKey(activeTab)))
    activeTab = tabs[0] ?? null
  return {
    panes: [
      {
        tabs,
        activeTab,
        temporaryTab: readTemporaryTab(view.temporaryTab, tabs),
      },
    ],
    focusedPane: 0,
  }
}
