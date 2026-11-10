/**
 * The name and the domain of the product. Every screen reads them from
 * here, so that one change renames the product. The app lives on the
 * `app.` subdomain.
 */
export const productName = 'Conductive'

export const productDomain = 'conductive.build'

/** The address of the app, which signs users in. */
export const appDomain = `app.${productDomain}`

/** The chip of a Mac: Apple silicon is `arm64`, and Intel is `x64`. */
export type MacChip = 'arm64' | 'x64'

/**
 * The file name of the DMG of the Mac app for each chip. The name holds no
 * version, so the latest release always gives the newest DMG under it.
 */
export const macDmgNames: Readonly<Record<MacChip, string>> = {
  arm64: `${productName}-mac-arm64.dmg`,
  x64: `${productName}-mac-x64.dmg`,
}
