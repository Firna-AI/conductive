/**
 * The shape of a post of the changelog page, which the site and its mockup
 * share.
 */

/** The sections of a post, in the order of the page. */
export const changelogSections = ['new', 'improved', 'fixed'] as const

/** A section of a post: New, Improved, or Fixed. */
export type ChangelogSection = (typeof changelogSections)[number]

/** One post: what changed in the releases of one day. */
export type ChangelogPost = {
  /** The day of the releases, as `YYYY-MM-DD`. It is also the id of the post. */
  readonly date: string
  /** A short headline. */
  readonly title: string
  /** The versions of the day, oldest first. */
  readonly versions: readonly string[]
  /** A short paragraph under the title, when the post has one. */
  readonly lead?: string
  /**
   * The changes of each section, one line for each change. A section
   * without changes is left out.
   */
  readonly sections: Readonly<
    Partial<Record<ChangelogSection, readonly string[]>>
  >
}
