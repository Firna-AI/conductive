import {
  macDmgNames,
  sourceRepository,
  type MacChip,
} from '../../docs/mockups/src/brand'

/** The GitHub page of the source repository, which holds the releases. */
export const sourceRepositoryHref = `https://github.com/${sourceRepository.owner}/${sourceRepository.name}`

/**
 * The releases of the source repository on GitHub. They give the complete
 * list of changes, which the changelog page links, and the Mac app files.
 */
export const releasesHref = `${sourceRepositoryHref}/releases`

/**
 * The address of the newest DMG of the Mac app for a chip: the file with its
 * fixed name in the latest release of the source repository.
 */
export function macDownloadHref(chip: MacChip): string {
  return `${releasesHref}/latest/download/${macDmgNames[chip]}`
}

/**
 * The address of the public docs: the overview is there, and each other
 * guide is under it, as `/docs/<id>`. The header and the footer link to it.
 */
export const docsPath = '/docs'

/** A section of the site that the header marks as the current one. */
export type SiteSection = 'docs' | 'pricing'

/** The paths of the pages of the site, on the root domain of the product. */
export const sitePaths = {
  home: '/',
  pricing: '/pricing',
  terms: '/terms',
  privacy: '/privacy',
  fromConductor: '/from-conductor',
  changelog: '/changelog',
} as const

/**
 * The address of each page of the site: a path on the site itself, or a
 * complete address on `origin`, for a page of another host.
 */
export function pageHrefs(
  origin?: string,
): Readonly<Record<keyof typeof sitePaths, string>> {
  const href = (path: string) => (origin ? new URL(path, origin).href : path)
  return {
    home: href(sitePaths.home),
    pricing: href(sitePaths.pricing),
    terms: href(sitePaths.terms),
    privacy: href(sitePaths.privacy),
    fromConductor: href(sitePaths.fromConductor),
    changelog: href(sitePaths.changelog),
  }
}
