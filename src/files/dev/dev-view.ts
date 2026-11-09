import type {
  FileListKind,
  FileMode,
  FilesLayout,
  FilesTab,
  FilesTarget,
} from '../navigation'

/**
 * The state of the development page, read from its address. Development
 * only: the product keeps this state in the workspace view on the Worker.
 */
export interface DevView {
  layout: FilesLayout
  theme: 'dark' | 'light'
  /** Mockup data matches the mockups. Live data also replays the updates. */
  scenario: 'mockup' | 'live'
  list: FileListKind
  active: FilesTab | null
  controls: boolean
  /** The lists whose repair failed before the page opened. */
  repair: readonly DevRepair[]
  /** The tree of All files before the page opened: `?tree=`. */
  tree: DevTree
}

/** A list whose fresh full report the stored history lost: `?repair=`. */
type DevRepair = 'all-files' | 'changes'

const repairs: readonly DevRepair[] = ['all-files', 'changes']

/**
 * The latest tree, or the cloud computer could not read the files: All
 * files keeps the saved tree, or no tree was saved.
 */
export type DevTree = 'latest' | 'saved' | 'none'

const trees: readonly DevTree[] = ['latest', 'saved', 'none']

const lists: readonly FileListKind[] = ['all', 'changes', 'checks']

function parseTab(value: string | null): FilesTab | null {
  if (!value) return null
  if (value.startsWith('diff:')) return { kind: 'diff', path: value.slice(5) }
  const match = /^file:(preview|source):(.+)$/.exec(value)
  if (!match) return null
  const mode: FileMode = match[1] === 'source' ? 'source' : 'preview'
  return { kind: 'file', path: match[2], mode }
}

function formatTab(tab: FilesTab): string {
  return tab.kind === 'diff'
    ? `diff:${tab.path}`
    : `file:${tab.mode}:${tab.path}`
}

export function readView(search: string): DevView {
  const query = new URLSearchParams(search)
  const list = lists.find((value) => value === query.get('list')) ?? 'all'
  return {
    layout: query.get('layout') === 'phone' ? 'phone' : 'desktop',
    theme: query.get('theme') === 'light' ? 'light' : 'dark',
    scenario: query.get('scenario') === 'live' ? 'live' : 'mockup',
    list,
    active: parseTab(query.get('tab')),
    controls: query.get('controls') !== 'off',
    repair: repairs.filter((repair) =>
      (query.get('repair') ?? '').split(',').includes(repair),
    ),
    tree: trees.find((tree) => tree === query.get('tree')) ?? 'latest',
  }
}

export function viewQuery(view: DevView): string {
  const query = new URLSearchParams()
  if (view.layout === 'phone') query.set('layout', 'phone')
  if (view.theme === 'light') query.set('theme', 'light')
  if (view.scenario === 'live') query.set('scenario', 'live')
  query.set('list', view.list)
  if (view.active) query.set('tab', formatTab(view.active))
  if (!view.controls) query.set('controls', 'off')
  if (view.repair.length > 0) query.set('repair', view.repair.join(','))
  if (view.tree !== 'latest') query.set('tree', view.tree)
  return `?${query}`
}

/** The view after a link: a list, or a file or diff tab. */
export function viewAfter(view: DevView, target: FilesTarget): DevView {
  if (target.kind === 'list') {
    // A phone shows one page at a time, so a list leaves the open file.
    const active = view.layout === 'phone' ? null : view.active
    return { ...view, list: target.list, active }
  }
  return { ...view, active: target }
}

export function sameTab(left: FilesTab, right: FilesTab): boolean {
  return left.kind === right.kind && left.path === right.path
}

/** The open tabs with this tab added, or put in place of its old mode. */
export function withTab(tabs: readonly FilesTab[], tab: FilesTab): FilesTab[] {
  const index = tabs.findIndex((open) => sameTab(open, tab))
  if (index < 0) return [...tabs, tab]
  return tabs.map((open, at) => (at === index ? tab : open))
}
