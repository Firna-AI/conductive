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
      [...page.querySelectorAll('main .pricing-card')].map((card) => ({
        name: card.querySelector('h2')?.textContent.trim(),
        price: card.querySelector('.pricing-amount')?.textContent.trim(),
        unit: card.querySelector('.pricing-unit')?.textContent.trim(),
        facts: [...card.querySelectorAll('.pricing-fact')].map((fact) =>
          fact.textContent.replace(/\s+/g, ' ').trim(),
        ),
      })),
    ).toEqual([
      {
        name: 'Free',
        price: '$0',
        unit: 'per month',
        facts: [
          '20 cloud hours a month for the org',
          'Up to 3 workspaces, not counting archived ones',
          'One free org for each person',
        ],
      },
      {
        name: 'Plus',
        price: '$20',
        unit: 'per member per month',
        facts: [
          '275 cloud hours a month for each member',
          'Unlimited workspaces',
          'Unlimited cloud computers at once',
          'Extra hours at $0.07 each',
        ],
      },
      {
        name: 'Pro',
        price: '$50',
        unit: 'per member per month',
        facts: [
          '700 cloud hours a month for each member',
          'Unlimited workspaces',
          'Unlimited cloud computers at once',
          'Extra hours at $0.07 each',
        ],
      },
      {
        name: 'Ultra',
        price: '$200',
        unit: 'per member per month',
        facts: [
          '2,750 cloud hours a month for each member',
          'Unlimited workspaces',
          'Unlimited cloud computers at once',
          'Extra hours at $0.07 each',
        ],
      },
    ])
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
