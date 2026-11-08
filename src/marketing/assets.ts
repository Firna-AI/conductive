/// <reference types="vite/client" />
import lockupDark from '../../docs/brand/conductive-lockup-dark.svg'
import lockupLight from '../../docs/brand/conductive-lockup-light.svg'
import appleTouchIcon from '../../docs/brand/web/apple-touch-icon.png?no-inline'
import faviconIco from '../../docs/brand/web/favicon.ico?no-inline'
import faviconSvg from '../../docs/brand/web/favicon.svg?no-inline'
import interFont from '../../docs/mockups/src/fonts/InterVariable.woff2'
import { pictureFileUrls } from './picture-files'

/**
 * The files of the site other than its pictures, from the brand folder and
 * the font of the mockups. The build gives each one an address under the
 * static assets of the Worker. `?no-inline` keeps a small file a file, so
 * that each address stays on the site.
 */
export const siteFiles = {
  font: interFont,
  lockup: { dark: lockupDark, light: lockupLight },
  favicon: { svg: faviconSvg, ico: faviconIco },
  appleTouchIcon,
} as const

/** The intrinsic size of the lockups, from their SVG files. */
export const lockupSize = { width: 682, height: 127 } as const

/** Browsers ask for this path when a page names no icon. */
const faviconPath = '/favicon.ico'

/**
 * The path of a file's address. In development an address can carry a
 * query, such as `?no-inline`, that a request for the file leaves out.
 */
function pathOf(address: string): string {
  return new URL(address, 'https://site.invalid').pathname
}

const assetPaths = new Set(
  [
    siteFiles.font,
    siteFiles.lockup.dark,
    siteFiles.lockup.light,
    siteFiles.favicon.svg,
    siteFiles.favicon.ico,
    siteFiles.appleTouchIcon,
    ...pictureFileUrls,
  ].map(pathOf),
)

/**
 * The path of the static asset that a request of the site names, or
 * `undefined` for every other path. The site serves only its own files,
 * not the app's.
 */
export function siteAssetPath(pathname: string): string | undefined {
  if (pathname === faviconPath) return pathOf(siteFiles.favicon.ico)
  return assetPaths.has(pathname) ? pathname : undefined
}
