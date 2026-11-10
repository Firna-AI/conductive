import { Window, type Document, type Element } from 'happy-dom'
import { expect } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { docsPath } from '../../src/marketing/links'
import { links } from './html.test-support'

function element(root: Document | Element, selector: string) {
  const matches = root.querySelectorAll(selector)
  expect(matches, selector).toHaveLength(1)
  return matches[0]
}

const guideIds = [
  '',
  'get-started',
  'agent-logins',
  'workspaces',
  'sessions-and-chat',
  'files-and-changes',
  'terminal-and-previews',
  'pull-requests',
  'cloud-computer',
  'orgs-and-members',
  'mac-app',
  'security',
]
const guideHrefs = guideIds.map((id) => (id ? `${docsPath}/${id}` : docsPath))

function checkGuidePage(document: Document, path: string) {
  const title = element(document, 'h1').textContent.trim()
  expect(title.length, path).toBeGreaterThan(0)
  expect(document.title, path).toBe(`${title} – ${productName}`)
  const description = element(document, '.docs-lead').textContent.trim()
  expect(description.length, path).toBeGreaterThan(0)
  expect(
    element(document, 'meta[name="description"]').getAttribute('content'),
    path,
  ).toBe(description)
  expect(element(document, '.docs-label').textContent.trim(), path).toBe(
    'Start',
  )

  const body = element(document, '.docs-body')
  expect(body.firstElementChild?.tagName, path).toBe('H2')
  expect(body.querySelectorAll('p').length, path).toBeGreaterThan(0)
  expect(body.querySelectorAll('li').length, path).toBeGreaterThan(0)
  const headings = [...body.querySelectorAll('h2')]
  expect(headings.length, path).toBeGreaterThan(0)
  const sections = headings.map((heading) => ({
    href: `#${heading.id}`,
    text: heading.textContent.trim(),
  }))
  for (const heading of headings) {
    expect(heading.id.length, path).toBeGreaterThan(0)
    expect(
      document.querySelectorAll(`[id="${heading.id}"]`),
      path,
    ).toHaveLength(1)
    expect(heading.querySelectorAll('a'), path).toHaveLength(0)
  }
  const contents = document.querySelectorAll('nav[aria-label="On this page"]')
  expect(contents, path).toHaveLength(2)
  for (const list of contents) {
    expect(
      [...list.querySelectorAll('a')].map((link) => ({
        href: link.getAttribute('href'),
        text: link.textContent.trim(),
      })),
      path,
    ).toEqual(sections)
  }

  const headerLink = element(document, '.header a[href="' + docsPath + '"]')
  expect(headerLink.textContent.trim(), path).toBe('Docs')
  expect(headerLink.getAttribute('aria-current'), path).toBe('true')
  expect(headerLink.classList.contains('header-current'), path).toBe(true)
  expect(
    element(document, 'footer a[href="' + docsPath + '"]').textContent.trim(),
    path,
  ).toBe('Docs')
  const menus = document.querySelectorAll('nav[aria-label="Docs"]')
  expect(menus, path).toHaveLength(2)
  for (const menu of menus) {
    expect(
      [...menu.querySelectorAll('ul')].map((group) => ({
        name: group.getAttribute('aria-label'),
        hrefs: links(group.innerHTML).map((link) => link.href),
      })),
      path,
    ).toEqual([
      { name: 'Start', hrefs: guideHrefs.slice(0, 3) },
      { name: 'Work', hrefs: guideHrefs.slice(3, 8) },
      { name: 'Manage', hrefs: guideHrefs.slice(8) },
    ])
    const current = element(menu, 'a[aria-current]')
    expect(current.getAttribute('href'), path).toBe(path)
    expect(current.getAttribute('aria-current'), path).toBe('page')
    expect(current.textContent.trim(), path).toBe(title)
    expect(current.classList.contains('docs-nav-current'), path).toBe(true)
  }
  const disclosures = document.querySelectorAll('details')
  expect(disclosures, path).toHaveLength(2)
  for (const disclosure of disclosures) {
    expect(disclosure.hasAttribute('open'), path).toBe(false)
    expect(
      element(disclosure, 'summary').textContent.trim().length,
      path,
    ).toBeGreaterThan(0)
  }
  return headings.map((heading) => heading.id)
}

export async function checkGuideRoutes(
  get: (path: string) => Promise<Response>,
) {
  const window = new Window()
  const headingIds: string[][] = []
  try {
    for (const [path, neighbours] of [
      [docsPath, [`${docsPath}/get-started`]],
      [`${docsPath}/get-started`, [docsPath, `${docsPath}/agent-logins`]],
    ] as const) {
      const response = await get(path)
      expect(response.status, path).toBe(200)
      const document = new window.DOMParser().parseFromString(
        await response.text(),
        'text/html',
      )
      headingIds.push(checkGuidePage(document, path))
      const pager = element(
        document,
        'nav[aria-label="Previous and next guides"]',
      )
      expect(
        links(pager.innerHTML).map((link) => link.href),
        path,
      ).toEqual(neighbours)
    }
    expect(headingIds[0]).not.toEqual(headingIds[1])
    expect((await get(`${docsPath}/overview`)).status).toBe(404)
  } finally {
    await window.happyDOM.close()
  }
}

export async function checkScrollRegions(
  get: (path: string) => Promise<Response>,
) {
  const window = new Window()
  try {
    const document = new window.DOMParser().parseFromString(
      await (await get(`${docsPath}/get-started`)).text(),
      'text/html',
    )
    const body = element(document, '.docs-body')
    expect(body.querySelectorAll('pre code .token').length).toBeGreaterThan(0)
    for (const tag of ['pre', 'table']) {
      const regions = body.querySelectorAll(tag)
      expect(regions.length, tag).toBeGreaterThan(0)
      for (const region of regions) {
        expect(region.getAttribute('tabindex'), tag).toBe('0')
        expect(
          region.getAttribute('aria-label')?.trim().length ?? 0,
          tag,
        ).toBeGreaterThan(0)
        expect(region.getAttribute('role') ?? tag, tag).toBe(
          tag === 'pre' ? 'region' : 'table',
        )
      }
    }
  } finally {
    await window.happyDOM.close()
  }
}
