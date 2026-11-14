import { describe, expect, test } from 'vitest'
import { parseRoute, routes } from '../app/router'
import {
  appAddress,
  bareAddressAt,
  readsAsAddress,
  webAddressParts,
  webLink,
  type WebLinkContext,
} from './web-links'

const context: WebLinkContext = {
  appOrigin: 'https://app.example',
  isAppPage: (url) =>
    parseRoute(url.pathname, url.search).screen !== 'not-found',
}

describe('web addresses', () => {
  test('classifies app pages and other web pages', () => {
    const path = routes.accountTab('agents')
    const href = `${context.appOrigin}${path}?connect=codex#form`
    expect(webLink(href, context)).toEqual({
      kind: 'app',
      url: new URL(href),
      to: `${path}?connect=codex#form`,
    })
    const outside = 'https://github.com/acme/app/pull/2'
    expect(webLink(outside, context)).toEqual({
      kind: 'web',
      url: new URL(outside),
    })
  })

  test('refuses other schemes, credentials, invalid addresses, and app non-pages', () => {
    for (const href of [
      'mailto:user@example.com',
      'vscode://file/project',
      'ftp://example.com',
      'https://user@example.com/',
      'https://:password@example.com/',
      'https://user:password@app.example/',
      'no address',
      'https://',
      `${context.appOrigin}/api/workspaces`,
    ]) {
      expect(webLink(href, context), href).toBeUndefined()
    }
  })

  test('reads each local host with explicit and default ports', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']) {
      for (const [scheme, suffix, port] of [
        ['http', ':3000/path?q=1#part', 3000],
        ['https', ':4000/', 4000],
        ['http', '/', 80],
        ['https', '/', 443],
      ] as const) {
        const href = `${scheme}://${host}${suffix}`
        expect(webLink(href, context), href).toEqual({
          kind: 'local',
          url: new URL(href),
          port,
        })
      }
    }
  })

  test('checks a local app origin before local hosts, including its non-pages', () => {
    const dev = { ...context, appOrigin: 'http://127.0.0.1:5173' }
    const href = `${dev.appOrigin}${routes.home()}`
    expect(webLink(href, dev)).toEqual({
      kind: 'app',
      url: new URL(href),
      to: '/',
    })
    expect(webLink(`${dev.appOrigin}/api/workspaces`, dev)).toBeUndefined()
    expect(webLink('http://127.0.0.1:3000/', dev)).toEqual({
      kind: 'local',
      url: new URL('http://127.0.0.1:3000/'),
      port: 3000,
    })
  })

  test('builds app addresses with one slash without decoding path segments', () => {
    const url = new URL('https://app.example//account///agents/?next=%2F#form')
    expect(appAddress(url)).toBe('/account/agents?next=%2F#form')
    const path = routes.workspace('acme', 'id', 'files', 'src/cart.ts')
    const href = `${context.appOrigin}/${path}/?line=2#diff`
    expect(webLink(href, context)).toEqual({
      kind: 'app',
      url: new URL(href),
      to: `${path}?line=2#diff`,
    })
    expect(appAddress(new URL('https://app.example///?q=1#top'))).toBe(
      '/?q=1#top',
    )
  })

  test('keeps balanced parentheses and leaves trailing punctuation and marks out', () => {
    const href = 'https://example.com/a_(b(c))'
    expect(bareAddressAt(`Read (${href})).,;:!?'"*_~] now`, 6)).toBe(href)
    expect(bareAddressAt('https://example.com`code', 0)).toBe(
      'https://example.com',
    )
    expect(bareAddressAt('https://example.com/a<b', 0)).toBe(
      'https://example.com/a',
    )
    expect(bareAddressAt('https://example.com/a>b', 0)).toBe(
      'https://example.com/a',
    )
    expect(bareAddressAt('no link', 0)).toBeNull()
    expect(bareAddressAt('ftp://example.com/', 0)).toBeNull()
  })

  test('splits addresses with the same end rule and preserves Markdown source', () => {
    const href = 'https://example.com/a_(b)'
    expect(
      webAddressParts(`(${href}). [docs](<https://example.com/docs>)`),
    ).toEqual([
      { kind: 'text', text: '(' },
      { kind: 'link', href, source: href },
      { kind: 'text', text: '). ' },
      {
        kind: 'link',
        href: 'https://example.com/docs',
        source: '[docs](<https://example.com/docs>)',
        label: 'docs',
      },
    ])
    expect(webAddressParts('[docs](https://example.com/docs)', false)).toEqual([
      { kind: 'text', text: '[docs](' },
      {
        kind: 'link',
        href: 'https://example.com/docs',
        source: 'https://example.com/docs',
      },
      { kind: 'text', text: ')' },
    ])
  })

  test('tests labels as shown without code, bold, invisible characters, or edge spaces', () => {
    for (const label of [
      '`https://github.com`',
      '**https://github.com**',
      ' https\u200b://github.com ',
      '\u2060 WWW.GitHub.com ',
    ]) {
      expect(readsAsAddress(label), label).toBe(true)
    }
    for (const label of ['PR #2', 'github.com/acme', '**docs**']) {
      expect(readsAsAddress(label), label).toBe(false)
    }
  })

  test.each([
    ['Wiki', 'https://en.wikipedia.org/wiki/Function_(mathematics)'],
    ['Wiki', '<https://en.wikipedia.org/wiki/Function_(mathematics)>'],
    [
      'Wiki',
      String.raw`https://en.wikipedia.org/wiki/Function_\(mathematics\)`,
    ],
    [
      'Page',
      'https://github.com/acme/app/blob/main/app/(marketing)/page.tsx#L4',
    ],
  ])(
    'reads the complete Markdown destination in [%s](%s)',
    (label, address) => {
      const source = `[${label}](${address})`
      const href =
        label === 'Wiki'
          ? 'https://en.wikipedia.org/wiki/Function_(mathematics)'
          : 'https://github.com/acme/app/blob/main/app/(marketing)/page.tsx#L4'
      expect(webAddressParts(`See ${source}.`)).toEqual([
        { kind: 'text', text: 'See ' },
        { kind: 'link', href, source, label },
        { kind: 'text', text: '.' },
      ])
      const angle = address.startsWith('<')
      expect(webAddressParts(source, false)).toEqual([
        { kind: 'text', text: `[${label}](${angle ? '<' : ''}` },
        {
          kind: 'link',
          href,
          source: angle ? address.slice(1, -1) : address,
        },
        { kind: 'text', text: angle ? '>)' : ')' },
      ])
    },
  )

  test.each([
    ['https://example.com/a<b', 'https://example.com/a<b'],
    ['https://example.com/a>b', 'https://example.com/a>b'],
    ['https://example.com/a`b', 'https://example.com/a`b'],
    ['<https://example.com/a b>', 'https://example.com/a b'],
    ['http://[::1]', 'http://[::1]'],
  ])('leaves address validation to webLink for %s', (address, href) => {
    const source = `[docs](${address})`
    expect(webAddressParts(source)).toEqual([
      { kind: 'link', href, source, label: 'docs' },
    ])
    expect(webLink(href, context)).toEqual({
      kind: href === 'http://[::1]' ? 'local' : 'web',
      url: new URL(href),
      ...(href === 'http://[::1]' ? { port: 80 } : {}),
    })
  })

  test('keeps titles and spaces around a Markdown address as typed', () => {
    for (const [before, after] of [
      ['[docs](', ' "Guide")'],
      ['[docs]( ', ' )'],
    ]) {
      expect(
        webAddressParts(`${before}https://example.com/docs${after}`),
      ).toEqual([
        { kind: 'text', text: before },
        {
          kind: 'link',
          href: 'https://example.com/docs',
          source: 'https://example.com/docs',
        },
        { kind: 'text', text: after },
      ])
    }
  })

  test('keeps Markdown destinations beyond the length and nesting limits as typed', () => {
    const long = `https://example.com/${'a'.repeat(2001)}`
    const deep = `https://example.com/${'('.repeat(33)}x${')'.repeat(33)}`
    for (const [before, href, after] of [
      ['[docs](', long, ')'],
      ['[docs](<', long, '>)'],
      ['[docs](', deep, ')'],
    ]) {
      expect(webAddressParts(`${before}${href}${after}`)).toEqual([
        { kind: 'text', text: before },
        { kind: 'link', href, source: href },
        { kind: 'text', text: after },
      ])
    }
  })
})
