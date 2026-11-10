/**
 * The sections of the sidebar: groups of workspaces that the user defines.
 * A section is not tied to a repository, so it can mix workspaces of
 * several repositories.
 */

export const sectionKeys = ['general', 'checkout', 'infra'] as const

/** A section of the list when the app opens. */
type ListSectionKey = (typeof sectionKeys)[number]

/**
 * The one section that an import from Conductor puts each workspace in.
 * The import creates it when the org has none, so it is not one of the
 * sections of the list when the app opens.
 */
const importSection = 'conductor'

export type SectionKey = ListSectionKey | typeof importSection

export type Section = {
  key: SectionKey
  name: string
  /** The section shows only its header. */
  collapsed: boolean
}

export const sections: Readonly<Record<ListSectionKey, Section>> = {
  general: { key: 'general', name: 'General', collapsed: false },
  checkout: { key: 'checkout', name: 'Checkout', collapsed: false },
  infra: { key: 'infra', name: 'Infra', collapsed: true },
}

/**
 * The section that an import from Conductor creates, for its workspaces.
 * The list of the app when it opens does not hold it, so only the screens
 * after an import add it.
 */
export const conductorSection: Section = {
  key: importSection,
  name: 'Import from Conductor',
  collapsed: false,
}

/** New workspaces join this section. The user can rename it. */
export const defaultSection: ListSectionKey = 'general'

/** The section whose menu the section state opens. */
export const menuSection: ListSectionKey = 'checkout'
