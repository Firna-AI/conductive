import { paths } from '../../paths'

/**
 * The states of an open command palette that the mockups draw. Each state
 * names its tab. The states of the Workspaces tab name their filter, or the
 * menu that lies open, and the states of a search name their query.
 */
export const openPaletteViews = [
  'all',
  'workspaces',
  'workspaces-repository',
  'workspaces-archived',
  'actions',
  'settings',
  'search',
  'no-results',
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
  actions: 'actions',
  settings: 'settings',
  search: 'all',
  'no-results': 'all',
}

/**
 * The text that the person typed. The search finds the Checkout workspace
 * and an archived one. Nothing in Acme matches the other query.
 */
export const paletteQueries: Readonly<
  Partial<Record<OpenPaletteView, string>>
> = { search: 'check', 'no-results': 'refund' }
