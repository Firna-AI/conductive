import { paths } from '../../../paths'

/** The groups of the docs, in the order of the menu. */
export const docsGroups = ['Start', 'Work', 'Manage'] as const

type DocsGroup = (typeof docsGroups)[number]

/**
 * The launch guides, in the order of the menu: by group, then by their
 * place in the group. Each guide has `to` only when the mockups draw it.
 */
const guides = [
  { key: 'overview', title: 'Overview', group: 'Start', to: paths.docs },
  {
    key: 'get-started',
    title: 'Get started',
    group: 'Start',
    to: paths.docsGetStarted,
  },
  { key: 'agent-logins', title: 'Agent logins', group: 'Start' },
  { key: 'workspaces', title: 'Workspaces', group: 'Work' },
  { key: 'sessions-and-chat', title: 'Sessions and chat', group: 'Work' },
  { key: 'files-and-changes', title: 'Files and changes', group: 'Work' },
  {
    key: 'terminal-and-previews',
    title: 'Terminal and previews',
    group: 'Work',
  },
  { key: 'pull-requests', title: 'Pull requests', group: 'Work' },
  { key: 'cloud-computer', title: 'Cloud computer', group: 'Manage' },
  { key: 'orgs-and-members', title: 'Orgs and members', group: 'Manage' },
  { key: 'mac-app', title: 'Mac app', group: 'Manage' },
  { key: 'security', title: 'Security', group: 'Manage' },
] as const

export type DocsGuideKey = (typeof guides)[number]['key']

export type DocsGuide = {
  key: DocsGuideKey
  title: string
  group: DocsGroup
  /** The screen of the guide, when the mockups draw it. */
  to?: string
}

const docsGuides: readonly DocsGuide[] = guides

/** The guides of one group, in the order of the menu. */
export function guidesIn(group: DocsGroup): readonly DocsGuide[] {
  return docsGuides.filter((guide) => guide.group === group)
}

/**
 * A guide and its neighbours in the order of the menu, which the foot of
 * its page links: the first guide has no previous one, the last no next.
 */
export function guideWithNeighbours(key: DocsGuideKey): {
  guide: DocsGuide
  previous?: DocsGuide
  next?: DocsGuide
} {
  const index = docsGuides.findIndex((guide) => guide.key === key)
  const guide = docsGuides.at(index)
  if (index < 0 || !guide) throw new Error(`The docs have no guide ${key}.`)
  return {
    guide,
    previous: index > 0 ? docsGuides.at(index - 1) : undefined,
    next: docsGuides.at(index + 1),
  }
}
