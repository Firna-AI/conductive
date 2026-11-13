// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, onTestFinished, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../../app/navigation'
import { ServicesContext } from '../../../app/services'
import { testServices } from '../../../app/test-kit'
import { FakeApiServer } from '../../../test-support/fake-api'
import { FAKE_ORIGIN } from '../../../test-support/fixtures/core'
import type { TerminalLinks } from '../../../terminal/terminalLinks'
import { useTerminalLinks } from './terminal-links'
import { previewPortHref } from './tool-address'

/** The links of the terminal of workspace `w1` of org `acme`. */
function mountLinks() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const navigation = memoryNavigation('/o/acme/w/w1')
  const tabs: string[] = []
  const services = testServices(new FakeApiServer(), {
    openInNewTab: (url) => tabs.push(url),
  })
  let links: TerminalLinks | undefined
  function Probe() {
    links = useTerminalLinks('acme', 'w1')
    return null
  }
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() =>
    root.render(
      <ServicesContext.Provider value={services}>
        <NavigationContext.Provider value={navigation}>
          <Probe />
        </NavigationContext.Provider>
      </ServicesContext.Provider>,
    ),
  )
  onTestFinished(() => act(() => root.unmount()))
  if (!links) throw new Error('The probe did not render.')
  return { links, navigation, tabs }
}

describe('useTerminalLinks', () => {
  test('opens a local address at the Preview tool address of its port', () => {
    const { links, navigation, tabs } = mountLinks()
    links.open({ kind: 'local', port: 5173 })
    expect(navigation.href()).toBe(previewPortHref('acme', 'w1', 5173))
    expect(tabs).toEqual([])
  })

  test('opens an app page in the app, and a web link in a new tab', () => {
    const { links, navigation, tabs } = mountLinks()
    links.open({ kind: 'app', to: '/o/acme' })
    links.open({ kind: 'web', href: 'https://github.com/acme' })
    expect(navigation.href()).toBe('/o/acme')
    expect(tabs).toEqual(['https://github.com/acme'])
  })

  test('gives the app origin and reads a page of the app with the router', () => {
    const { links } = mountLinks()
    expect(links.context.appOrigin).toBe(FAKE_ORIGIN)
    expect(links.context.isAppPage(new URL(`${FAKE_ORIGIN}/`))).toBe(true)
    expect(links.context.isAppPage(new URL(`${FAKE_ORIGIN}/%E0`))).toBe(false)
  })
})
