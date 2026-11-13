import { describe, expect, it } from 'vitest'
import type { WebLinkContext } from '../markdown/web-links'
import { linkHint, linkKey, terminalLink } from './terminalLinks'

/** The app of `npm run dev`, whose origin is a local address. */
const devApp: WebLinkContext = {
  appOrigin: 'http://127.0.0.1:5173',
  isAppPage: () => true,
}

const app: WebLinkContext = {
  appOrigin: 'https://conductive.build',
  isAppPage: (url) => url.pathname.startsWith('/o/'),
}

describe('terminalLink', () => {
  it('reads each local host as a port of the cloud computer', () => {
    expect(terminalLink('http://localhost:5173/', app)).toEqual({
      kind: 'local',
      port: 5173,
    })
    expect(terminalLink('http://0.0.0.0:3000/__debug', app)).toEqual({
      kind: 'local',
      port: 3000,
    })
    expect(terminalLink('http://[::1]:8080', app)).toEqual({
      kind: 'local',
      port: 8080,
    })
    expect(terminalLink('http://localhost', app)).toEqual({
      kind: 'local',
      port: 80,
    })
    expect(terminalLink('https://127.0.0.1', app)).toEqual({
      kind: 'local',
      port: 443,
    })
  })

  it('reads a local address as the cloud computer, also at the app origin', () => {
    expect(terminalLink('http://127.0.0.1:5173/o/acme', devApp)).toEqual({
      kind: 'local',
      port: 5173,
    })
  })

  it('opens a page of the app in the app, and other addresses as web links', () => {
    expect(terminalLink('https://conductive.build/o/acme', app)).toEqual({
      kind: 'app',
      to: '/o/acme',
    })
    expect(terminalLink('https://github.com/acme/app/pull/2', app)).toEqual({
      kind: 'web',
      href: 'https://github.com/acme/app/pull/2',
    })
    expect(terminalLink('http://10.0.0.5:3000', app)).toEqual({
      kind: 'web',
      href: 'http://10.0.0.5:3000/',
    })
  })

  it('opens nothing for another scheme, credentials, or an app address with no page', () => {
    expect(terminalLink('ftp://example.com', app)).toBeUndefined()
    expect(terminalLink('javascript:alert(1)', app)).toBeUndefined()
    expect(
      terminalLink('https://github.com@evil.example/', app),
    ).toBeUndefined()
    expect(terminalLink('http://user:pw@localhost:3000', app)).toBeUndefined()
    expect(terminalLink('https://conductive.build/api/x', app)).toBeUndefined()
    expect(terminalLink('not an address', app)).toBeUndefined()
  })
})

describe('linkKey and linkHint', () => {
  it('uses Cmd on a Mac and Ctrl elsewhere', () => {
    expect(linkKey('MacIntel')).toBe('metaKey')
    expect(linkKey('Win32')).toBe('ctrlKey')
    expect(linkKey('Linux x86_64')).toBe('ctrlKey')
    expect(linkHint('metaKey')).toBe('⌘-click to open')
    expect(linkHint('ctrlKey')).toBe('Ctrl+click to open')
  })

  it('names the real host of a link with a label', () => {
    expect(linkHint('metaKey', 'reports.storefront.dev')).toBe(
      '⌘-click to open reports.storefront.dev',
    )
  })
})
