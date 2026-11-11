import type { OrgSummary } from '../../shared/orgs'
import type { Repository } from '../../shared/org-settings'
import type { ListData } from '../list-changes'
import type { Loadable } from '../store'
import type { PaletteOffer } from './page-actions'

/** The tabs of the palette, in their order. */
export const paletteTabs = ['all', 'workspaces', 'actions', 'settings'] as const

export type PaletteTab = (typeof paletteTabs)[number]

/** What the person chose: the tab, the text, and the filters of the Workspaces tab. */
export interface PaletteQuery {
  tab: PaletteTab
  /** The text of the search field. */
  text: string
  /** The repository of the Workspaces tab, or `null` for all. */
  repositoryId: string | null
  /** The Workspaces tab shows the archived workspaces, not the active ones. */
  archived: boolean
}

/**
 * The two reads of the palette that load and fail apart: the list of the
 * sections and the workspaces, and the repositories, whose names a search
 * looks at. They are parts of the org, which Try again reads again. The
 * list comes first, because without it no workspace row shows.
 */
export const paletteReads = ['list', 'repositories'] as const

export type PaletteRead = (typeof paletteReads)[number]

/**
 * What the actions and the settings of the palette read from the app. The
 * keys of their commands read it too, while the palette is closed.
 */
export interface PaletteBase {
  /** The orgs of the person, in the order of the org rail. */
  orgs: readonly OrgSummary[]
  /** The org of the palette, as `paletteOrg` says, or `null`. */
  org: OrgSummary | null
  /** The operator suspended the org, so it takes no change. */
  suspended: boolean
  /** The workspace that the page shows. Recent workspaces leaves it out. */
  openWorkspaceId: string | null
  /** Where Create org leads, as the org rail says. */
  createOrgHref: string
  /** What the parts of the page offer. */
  offers: readonly PaletteOffer[]
  /** The window is the Mac app, whose Account page has This Mac. */
  mac: boolean
}

/** What the palette reads from the app. */
export interface PaletteSource extends PaletteBase {
  /** The sections and the workspaces of the org, as they load. */
  list: Loadable<ListData>
  /** The repositories of the org, with their names, as they load. */
  repositories: Loadable<readonly Repository[]>
}

/** A repository that the filter of the Workspaces tab can choose. */
export interface RepositoryChoice {
  id: string
  name: string
}
