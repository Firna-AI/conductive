import { expect } from 'vitest'

import { macDmgNames } from '../../docs/mockups/src/brand'
import { macAppSection } from '../../src/marketing/features'
import { parityPageCopy } from '../../src/marketing/from-conductor/copy'
import { sitePaths, sourceRepositoryHref } from '../../src/marketing/links'
import { links } from './html.test-support'

/** The address that always gives the file `name` of the latest release. */
const latestRelease = (name: string) =>
  `${sourceRepositoryHref}/releases/latest/download/${name}`

export async function checkMacDownloads(
  get: (path: string) => Promise<Response>,
  siteOrigin: string,
) {
  const home = await (await get('/')).text()
  const comparison = await (await get(sitePaths.fromConductor)).text()
  /** The last call to action of a page: from its title to the footer. */
  const closing = (page: string, title: string) =>
    page.slice(page.indexOf(title), page.indexOf('<footer'))
  const hero = home.slice(home.indexOf('<h1'), home.indexOf(' id="features"'))
  const cases = [
    ['header', home.slice(0, home.indexOf('</header>')), 'Download'],
    ['hero', hero, 'Download for Mac'],
    [
      'home closing',
      closing(home, 'Give your next task its own cloud computer.'),
      'Download for Mac',
    ],
    [
      'comparison closing',
      closing(comparison, parityPageCopy.closing.title),
      'Download for Mac',
    ],
    ['footer', home.slice(home.indexOf('<footer')), 'Mac app'],
  ] as const
  for (const [part, html, text] of cases) {
    const href = links(html).find((link) => link.text === text)?.href
    const address = new URL(href ?? '/missing', siteOrigin)
    expect(address.pathname, part).toBe(sitePaths.home)
    const start = home.indexOf(` id="${address.hash.slice(1)}"`)
    expect(start, part).toBeGreaterThan(-1)
    const section = home.slice(start, home.indexOf('</section>', start))
    expect(links(section), part).toEqual([
      {
        href: latestRelease(macDmgNames.arm64),
        text: 'Download for Mac (Apple silicon)',
      },
      {
        href: latestRelease(macDmgNames.x64),
        text: 'Download for Mac (Intel)',
      },
    ])
    expect(section, part).toContain(macAppSection.requirement)
  }
}
