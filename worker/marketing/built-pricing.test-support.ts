import { Window } from 'happy-dom'
import { expect } from 'vitest'

import { productName } from '../../docs/mockups/src/brand'
import { sitePaths } from '../../src/marketing/links'
import { links } from './html.test-support'

export async function checkPricingPage(
  get: (path: string) => Promise<Response>,
  appOrigin: string,
) {
  const response = await get(sitePaths.pricing)
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  expect(response.headers.get('Cache-Control')).toBe('no-cache')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get('Set-Cookie')).toBeNull()

  const window = new Window()
  try {
    const parse = (html: string) =>
      new window.DOMParser().parseFromString(html, 'text/html')
    const page = parse(await response.text())
    expect(page.title).toBe(`Pricing – ${productName}`)
    expect(
      links(
        [...page.querySelectorAll('header nav a[aria-current="page"]')]
          .map((link) => link.outerHTML)
          .join(''),
      ),
    ).toEqual([{ href: sitePaths.pricing, text: 'Pricing' }])

    const home = parse(await (await get(sitePaths.home)).text())
    const product = [...home.querySelectorAll('footer h2')].find(
      (heading) => heading.textContent.trim() === 'Product',
    )?.nextElementSibling
    for (const [part, html] of [
      ['header', home.querySelector('header nav')?.innerHTML ?? ''],
      ['Product footer', product?.innerHTML ?? ''],
    ]) {
      expect(
        links(html).filter((link) => link.text === 'Pricing'),
        part,
      ).toEqual([{ href: sitePaths.pricing, text: 'Pricing' }])
    }

    const actions = links(page.querySelector('main .closing')?.innerHTML ?? '')
    expect(actions.map((link) => link.text)).toEqual([
      'Sign up',
      'Download for Mac',
    ])
    expect(actions.find((link) => link.text === 'Sign up')?.href).toBe(
      `${appOrigin}/`,
    )
  } finally {
    await window.happyDOM.close()
  }
}
