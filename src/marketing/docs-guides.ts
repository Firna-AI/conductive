import { docsPath } from './links'

/** The groups of the guides, in the order of the docs menu. */
const guideGroups = ['Start', 'Work', 'Manage'] as const

type GuideGroup = (typeof guideGroups)[number]

/** The group of a guide whose front matter names no valid group. */
const defaultGroup: GuideGroup = 'Start'

/** The ID of the overview, the one guide at the address of the docs. */
const overviewId = 'overview'

/**
 * One guide as the docs show it, from the ID of its file and its front
 * matter. A field without a valid value takes its default, as
 * docs/protocol/website-docs.md says, so a field never stops the build.
 */
export type Guide = {
  readonly id: string
  /** The title, or the ID when the front matter gives no title. */
  readonly title: string
  /** The lead under the title. Without it, the page shows no lead. */
  readonly description?: string
  readonly group: GuideGroup
  /** The place in the group. A guide without one comes after the others. */
  readonly order?: number
  /** The address: `/docs` for the overview, `/docs/<id>` for the others. */
  readonly href: string
}

/** A group of the docs menu that has guides, with its guides in order. */
export type MenuGroup = {
  readonly name: GuideGroup
  readonly guides: readonly Guide[]
}

/**
 * The page of one guide: its content entry, the guide, the groups of the
 * menu, and the guides before and after it in the order of the menu.
 */
export type GuidePage<Entry> = {
  readonly entry: Entry
  readonly guide: Guide
  readonly groups: readonly MenuGroup[]
  readonly previous?: Guide
  readonly next?: Guide
}

/** The value of one field of the front matter, which can hold anything. */
function field(data: unknown, name: string): unknown {
  if (typeof data !== 'object' || data === null) return undefined
  return Object.getOwnPropertyDescriptor(data, name)?.value
}

/** Text that is not empty, without the spaces at its ends. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const words = value.trim()
  return words === '' ? undefined : words
}

function group(value: unknown): GuideGroup {
  return guideGroups.find((name) => name === value) ?? defaultGroup
}

function order(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * The part of the address of a guide after `/docs/`. The overview has
 * none, so it has only the address `/docs`.
 */
export function guideParam(id: string): string | undefined {
  return id === overviewId ? undefined : id
}

function guideHref(id: string): string {
  const param = guideParam(id)
  return param === undefined ? docsPath : `${docsPath}/${param}`
}

/** A guide from the ID of its file and its front matter. */
function guideOf(id: string, data: unknown): Guide {
  return {
    id,
    title: text(field(data, 'title')) ?? id,
    description: text(field(data, 'description')),
    group: group(field(data, 'group')),
    order: order(field(data, 'order')),
    href: guideHref(id),
  }
}

/** A lower order first. A guide without an order comes after the others. */
function compareOrders(a?: number, b?: number): number {
  if (a === b) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return a < b ? -1 : 1
}

/** The ASCII order of two IDs, which hold only ASCII characters. */
function compareIds(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** The order of the menu: by group, then by order, then by ID. */
function compareGuides(a: Guide, b: Guide): number {
  return (
    guideGroups.indexOf(a.group) - guideGroups.indexOf(b.group) ||
    compareOrders(a.order, b.order) ||
    compareIds(a.id, b.id)
  )
}

/** The groups that have guides, each with its guides in order. */
function menuGroups(guides: readonly Guide[]): MenuGroup[] {
  return guideGroups
    .map((name) => ({
      name,
      guides: guides.filter((guide) => guide.group === name),
    }))
    .filter((menuGroup) => menuGroup.guides.length > 0)
}

/**
 * The page of each guide, in the order of the menu. The menu, the
 * previous and next links, and the addresses all come from these entries,
 * so the docs keep one list of their guides.
 */
export function guidePages<
  Entry extends { readonly id: string; readonly data: unknown },
>(entries: readonly Entry[]): GuidePage<Entry>[] {
  const pages = entries
    .map((entry) => ({ entry, guide: guideOf(entry.id, entry.data) }))
    .sort((a, b) => compareGuides(a.guide, b.guide))
  const guides = pages.map((page) => page.guide)
  const groups = menuGroups(guides)
  return pages.map((page, index) => ({
    ...page,
    groups,
    previous: index > 0 ? guides.at(index - 1) : undefined,
    next: guides.at(index + 1),
  }))
}
