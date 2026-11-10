import { memoryNavigation, NavigationContext } from '../../app/navigation'
import type { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_ORIGIN } from '../../test-support/fixtures/core'
import { holdAnimationFrames } from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'

/** The app at an address of an org, with the address bar that a test reads. */
export async function openApp(
  server: FakeApiServer,
  address: string,
  viewport: Viewport = 'desktop',
) {
  holdAnimationFrames()
  const app = await startedApp(server)
  const navigation = memoryNavigation(address)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport },
  )
  return { app, navigation, view }
}

/** The words of the element as a screen reader reads them, one space apart. */
export function wordsOf(element: Element): string {
  const words: string[] = []
  const walk = (node: Node) => {
    if (node instanceof Element && node.getAttribute('aria-hidden') === 'true')
      return
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) words.push(text)
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(element)
  return words.join(' ')
}

/** A Firna button marks itself with `aria-disabled`, a native one with `disabled`. */
export function isOff(element: Element): boolean {
  return (
    element.getAttribute('aria-disabled') === 'true' ||
    element.hasAttribute('disabled')
  )
}

/** The JSON bodies of the requests with this method and path, in their order. */
export async function bodiesOf(
  server: FakeApiServer,
  method: string,
  path: string,
): Promise<unknown[]> {
  const pathname = new URL(path, FAKE_ORIGIN).pathname
  const sent = server.requests.filter(
    (request) =>
      request.method === method && new URL(request.url).pathname === pathname,
  )
  return Promise.all(
    sent.map(async (request): Promise<unknown> =>
      JSON.parse(await request.clone().text()),
    ),
  )
}
