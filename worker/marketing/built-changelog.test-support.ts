import { readdir } from 'node:fs/promises'

import { Window } from 'happy-dom'
import { expect } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import {
  changelogLinkText,
  changelogPageCopy,
} from '../../src/marketing/changelog-copy'
import { changelogFolder } from '../../src/marketing/changelog-posts'
import { releasesHref, sitePaths } from '../../src/marketing/links'
import { links } from './html.test-support'

/** The post files of the site. The folder exists once it has a post. */
async function postFiles(): Promise<string[]> {
  try {
    const names = await readdir(changelogFolder)
    return names.filter((name) => name.endsWith('.md'))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

/**
 * Follows the last link of the Product column of the footer to the
 * changelog page. The top of the page links the releases on GitHub. The
 * posts follow newest first, each with its day as its address, or the
 * empty line when the site has no post.
 */
export async function checkChangelogPage(
  get: (path: string) => Promise<Response>,
) {
  const window = new Window()
  try {
    const parse = (html: string) =>
      new window.DOMParser().parseFromString(html, 'text/html')
    const home = parse(await (await get(sitePaths.home)).text())
    const product = [...home.querySelectorAll('footer h2')].find(
      (heading) => heading.textContent.trim() === 'Product',
    )?.nextElementSibling
    const link = links(product?.innerHTML ?? '').at(-1)
    expect(link).toEqual({ href: sitePaths.changelog, text: changelogLinkText })

    const response = await get(link?.href ?? sitePaths.home)
    expect(response.status).toBe(200)
    const page = parse(await response.text())
    expect(page.title).toBe(`Changelog – ${productName}`)
    const top = page.querySelector('main header')
    expect(links(top?.innerHTML ?? '').map((lead) => lead.href)).toEqual([
      releasesHref,
    ])

    const posts = [...page.querySelectorAll('main article')].map((post) => ({
      id: post.id,
      day: post.querySelector('time')?.getAttribute('datetime'),
      href: post.querySelector('a')?.getAttribute('href'),
    }))
    const days = posts.map((post) => post.id)
    expect(posts).toEqual(days.map((id) => ({ id, day: id, href: `#${id}` })))
    expect(days, 'newest first, one post for each day').toEqual(
      [...new Set(days)].sort().reverse(),
    )
    const emptyLine = [...page.querySelectorAll('main p')].some(
      (line) => line.textContent.trim() === changelogPageCopy.empty,
    )
    expect({ posts: posts.length > 0, emptyLine }).toEqual(
      (await postFiles()).length > 0
        ? { posts: true, emptyLine: false }
        : { posts: false, emptyLine: true },
    )
  } finally {
    await window.happyDOM.close()
  }
}
