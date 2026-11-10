import { macDmgNames, type MacChip } from '../../docs/mockups/src/brand'

export const sourceRepositoryHref = 'https://github.com/Firna-AI/remote-code'

/**
 * The address of the newest DMG of the Mac app for a chip: the file with its
 * fixed name in the latest release of the source repository.
 */
export function macDownloadHref(chip: MacChip): string {
  return `${sourceRepositoryHref}/releases/latest/download/${macDmgNames[chip]}`
}

/** The paths of the pages of the site, on the root domain of the product. */
export const sitePaths = {
  home: '/',
  terms: '/terms',
  privacy: '/privacy',
  fromConductor: '/from-conductor',
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
    terms: href(sitePaths.terms),
    privacy: href(sitePaths.privacy),
    fromConductor: href(sitePaths.fromConductor),
  }
}
