import { paths } from '../../paths'

/**
 * The states of an open command palette that the mockups draw. Each state
 * names its tab. The states of the Workspaces tab name their filter, or the
 * menu that lies open, and the states of a search name their query.
 * `workspaces-empty` has filters that leave no workspace to show. The
 * `loading` and `unavailable` states lack workspace data, as
 * `paletteStatuses` says.
 */
export const openPaletteViews = [
  'all',
  'workspaces',
  'workspaces-repository',
  'workspaces-archived',
  'workspaces-empty',
  'workspaces-unavailable',
  'actions',
  'settings',
  'search',
  'number',
  'number-part',
  'no-results',
  'search-loading',
  'search-unavailable',
  'search-repositories-unavailable',
] as const

export type OpenPaletteView = (typeof openPaletteViews)[number]

/** The palette of a screen: `closed` draws the screen without it. */
export const paletteViews = ['closed', ...openPaletteViews] as const

export type PaletteView = (typeof paletteViews)[number]

/** The tabs of the palette, in their order. */
export const paletteTabs = ['all', 'workspaces', 'actions', 'settings'] as const

export type PaletteTab = (typeof paletteTabs)[number]

export const paletteTabLabels: Readonly<Record<PaletteTab, string>> = {
  all: 'All',
  workspaces: 'Workspaces',
  actions: 'Actions',
  settings: 'Settings',
}

/** The page of each tab, so that each tab is a link to its own view. */
export const paletteTabPaths: Readonly<Record<PaletteTab, string>> = {
  all: paths.palette,
  workspaces: paths.paletteWorkspaces,
  actions: paths.paletteActions,
  settings: paths.paletteSettings,
}

/**
 * The page of each tab in the Mac app, where the palette shows the keys.
 * The Mac app has no page of its own for the Workspaces tab.
 */
export const macPaletteTabPaths: Readonly<Record<PaletteTab, string>> = {
  all: paths.macPalette,
  workspaces: paths.paletteWorkspaces,
  actions: paths.macPaletteActions,
  settings: paths.macPaletteSettings,
}

/**
 * The words in the search field of each tab while it is empty. A phone has
 * no room for the long words of the All tab, so it shows only "Search".
 */
export const palettePlaceholders: Readonly<Record<PaletteTab, string>> = {
  all: 'Search workspaces, actions, and settings',
  workspaces: 'Search workspaces',
  actions: 'Search actions',
  settings: 'Search settings',
}

export const phonePlaceholders: Readonly<Record<PaletteTab, string>> = {
  ...palettePlaceholders,
  all: 'Search',
}

export const viewTabs: Readonly<Record<OpenPaletteView, PaletteTab>> = {
  all: 'all',
  workspaces: 'workspaces',
  'workspaces-repository': 'workspaces',
  'workspaces-archived': 'workspaces',
  'workspaces-empty': 'workspaces',
  'workspaces-unavailable': 'workspaces',
  actions: 'actions',
  settings: 'settings',
  search: 'all',
  number: 'all',
  'number-part': 'all',
  'no-results': 'all',
  'search-loading': 'all',
  'search-unavailable': 'all',
  'search-repositories-unavailable': 'all',
}

/**
 * The text that the person typed. The search finds the Checkout workspace
 * and an archived one. The number finds the workspace of `W-395`, and the
 * part of a number finds each workspace whose label holds it. Nothing in
 * Acme matches "refund". "new" matches actions and a setting.
 */
export const paletteQueries: Readonly<
  Partial<Record<OpenPaletteView, string>>
> = {
  search: 'check',
  number: 'W-395',
  'number-part': '39',
  'no-results': 'refund',
  'search-loading': 'new',
  'search-unavailable': 'new',
  'search-repositories-unavailable': 'new',
}

/**
 * The workspace data that a state of the palette lacks: the repository
 * names, which a search looks at, while they load or after their read
 * failed, or the workspace list after its read failed. The page under the
 * palette reads the same list.
 */
export type PaletteStatus =
  'repositories-loading' | 'repositories-failed' | 'list-failed'

export const paletteStatuses: Readonly<
  Partial<Record<OpenPaletteView, PaletteStatus>>
> = {
  'workspaces-unavailable': 'list-failed',
  'search-loading': 'repositories-loading',
  'search-unavailable': 'list-failed',
  'search-repositories-unavailable': 'repositories-failed',
}
