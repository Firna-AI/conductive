/// <reference types="vite/client" />
import agentsDesktopDark from './pictures/agents-desktop-dark.webp'
import agentsDesktopLight from './pictures/agents-desktop-light.webp'
import agentsMobileDark from './pictures/agents-mobile-dark.webp'
import agentsMobileLight from './pictures/agents-mobile-light.webp'
import heroDesktopDark from './pictures/hero-desktop-dark.webp'
import heroDesktopLight from './pictures/hero-desktop-light.webp'
import heroMobileDark from './pictures/hero-mobile-dark.webp'
import heroMobileLight from './pictures/hero-mobile-light.webp'
import orgDesktopDark from './pictures/org-desktop-dark.webp'
import orgDesktopLight from './pictures/org-desktop-light.webp'
import orgMobileDark from './pictures/org-mobile-dark.webp'
import orgMobileLight from './pictures/org-mobile-light.webp'
import phoneDark from './pictures/phone-dark.webp'
import phoneLight from './pictures/phone-light.webp'
import reviewDesktopDark from './pictures/review-desktop-dark.webp'
import reviewDesktopLight from './pictures/review-desktop-light.webp'
import reviewMobileDark from './pictures/review-mobile-dark.webp'
import reviewMobileLight from './pictures/review-mobile-light.webp'
import startingDesktopDark from './pictures/starting-desktop-dark.webp'
import startingDesktopLight from './pictures/starting-desktop-light.webp'
import startingMobileDark from './pictures/starting-mobile-dark.webp'
import startingMobileLight from './pictures/starting-mobile-light.webp'
import toolsDesktopDark from './pictures/tools-desktop-dark.webp'
import toolsDesktopLight from './pictures/tools-desktop-light.webp'
import toolsMobileDark from './pictures/tools-mobile-dark.webp'
import toolsMobileLight from './pictures/tools-mobile-light.webp'

/** A still picture in both colour schemes: the address of each file. */
export type SchemeFiles = { readonly dark: string; readonly light: string }

/** One picture of the home page in both layouts of the site. */
export type LayoutFiles = {
  readonly desktop: SchemeFiles
  readonly mobile: SchemeFiles
}

/**
 * The still pictures of the home page. Each one is a real screen of the
 * mockups, captured at two device pixels for each CSS pixel. The phone
 * picture is one phone screen, which both layouts show.
 */
export const pictureFiles = {
  hero: {
    desktop: { dark: heroDesktopDark, light: heroDesktopLight },
    mobile: { dark: heroMobileDark, light: heroMobileLight },
  },
  starting: {
    desktop: { dark: startingDesktopDark, light: startingDesktopLight },
    mobile: { dark: startingMobileDark, light: startingMobileLight },
  },
  agents: {
    desktop: { dark: agentsDesktopDark, light: agentsDesktopLight },
    mobile: { dark: agentsMobileDark, light: agentsMobileLight },
  },
  review: {
    desktop: { dark: reviewDesktopDark, light: reviewDesktopLight },
    mobile: { dark: reviewMobileDark, light: reviewMobileLight },
  },
  tools: {
    desktop: { dark: toolsDesktopDark, light: toolsDesktopLight },
    mobile: { dark: toolsMobileDark, light: toolsMobileLight },
  },
  org: {
    desktop: { dark: orgDesktopDark, light: orgDesktopLight },
    mobile: { dark: orgMobileDark, light: orgMobileLight },
  },
  phone: {
    desktop: { dark: phoneDark, light: phoneLight },
    mobile: { dark: phoneDark, light: phoneLight },
  },
} as const satisfies Record<string, LayoutFiles>

/** Every address of a picture file, for the asset routes of the site. */
export const pictureFileUrls: readonly string[] = Object.values(
  pictureFiles,
).flatMap((files) => [
  files.desktop.dark,
  files.desktop.light,
  files.mobile.dark,
  files.mobile.light,
])
