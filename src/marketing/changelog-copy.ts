import { productName } from '../../docs/mockups/src/brand'
import type { ChangelogSection } from './changelog-model'
import type { CopyText } from './from-conductor/copy'
import { releasesHref } from './links'

/**
 * The lead of the page. It ends with a link to the releases on GitHub. They
 * give the complete list of changes, with the changes that no post names.
 */
const lead: CopyText = [
  "See what changed in each day's releases. The ",
  { text: 'releases on GitHub', href: releasesHref },
  ' give the complete list.',
]

/**
 * The words of the changelog page, for the site and its mockup, so that
 * both show the same words, each in its own markup.
 */
export const changelogPageCopy = {
  documentTitle: `Changelog – ${productName}`,
  description: `See what changed in each day's releases of ${productName}.`,
  label: 'Changelog',
  title: `What's new in ${productName}.`,
  lead,
  /** The name of each section of a post. */
  sections: {
    new: 'New',
    improved: 'Improved',
    fixed: 'Fixed',
  } satisfies Readonly<Record<ChangelogSection, string>>,
  /** The line that shows in place of the posts when the page has none. */
  empty: 'The first post comes with the next release.',
} as const

/** The words of the link of the footer that leads to the page. */
export const changelogLinkText = 'Changelog'

const versionList = new Intl.ListFormat('en-US', { type: 'conjunction' })

/**
 * The versions of a post as words, such as "Versions 0.13.0, 0.14.0, and
 * 0.15.0". Each version shows in full, so a visitor can find an installed
 * version with the find of the browser. A post without versions has no
 * words for them.
 */
export function versionsText(versions: readonly string[]): string | null {
  if (versions.length === 0) return null
  const noun = versions.length === 1 ? 'Version' : 'Versions'
  return `${noun} ${versionList.format(versions)}`
}
