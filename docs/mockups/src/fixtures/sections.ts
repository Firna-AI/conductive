/**
 * The sections of the sidebar: groups of workspaces that the user defines.
 * A section is not tied to a repository, so it can mix workspaces of
 * several repositories.
 */

export const sectionKeys = ['general', 'checkout', 'infra'] as const

export type SectionKey = (typeof sectionKeys)[number]

export type Section = {
  key: SectionKey
  name: string
  /** The section shows only its header. */
  collapsed: boolean
}

export const sections: Readonly<Record<SectionKey, Section>> = {
  general: { key: 'general', name: 'General', collapsed: false },
  checkout: { key: 'checkout', name: 'Checkout', collapsed: false },
  infra: { key: 'infra', name: 'Infra', collapsed: true },
}

/** New workspaces join this section. The user can rename it. */
export const defaultSection: SectionKey = 'general'

/** The section whose menu the section state opens. */
export const menuSection: SectionKey = 'checkout'
