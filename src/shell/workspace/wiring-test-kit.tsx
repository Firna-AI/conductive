import type { AppServices } from '../../app/services'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import type { TerminalSocket } from '../../app/terminal-transport'
import { accessibleName, byLabel } from '../../test-support/dom-queries'
import type { FakeApiServer } from '../../test-support/fake-api'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp } from '../test-render'
import type { Viewport } from '../ui/viewport'
import { recordingSocket } from './kept-test-kit'

// The helpers of the tests that mount the parts of the workspace screen.

/**
 * The whole app in a tab at `href`, over the fake API and its stream. The
 * services can replace the event source, such as with a terminal socket,
 * and the timer, such as with a `ManualDelay` that runs the reads again.
 */
export async function openTab(
  server: FakeApiServer,
  href: string,
  options: {
    viewport?: Viewport
    events?: AppServices['events']
    delay?: AppServices['delay']
  } = {},
) {
  const app = await startedApp(server, {
    events: options.events ?? recordingSocket(server).source,
    ...(options.delay ? { delay: options.delay } : {}),
  })
  const navigation = memoryNavigation(href)
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
    { viewport: options.viewport ?? 'desktop' },
  )
  await settle()
  return { view, navigation }
}

/** The links to `href` inside `root`. */
export function linksTo(root: ParentNode, href: string): HTMLAnchorElement[] {
  return Array.from(root.querySelectorAll('a')).filter(
    (link) => link.getAttribute('href') === href,
  )
}

/** The one link to `href` inside `root`, for a click. */
export function linkTo(root: ParentNode, href: string): HTMLAnchorElement {
  const links = linksTo(root, href)
  if (links.length !== 1) {
    throw new Error(`Expected one link to ${href}, found ${links.length}.`)
  }
  return links[0]
}

/** Whether each link to `href` is the current one, as `aria-current` says. */
export function currents(root: ParentNode, href: string): (string | null)[] {
  return linksTo(root, href).map((link) => link.getAttribute('aria-current'))
}

/** The name of each tab of the row, as a screen reader reads its control. */
export function tabNames(view: HTMLElement): string[] {
  const row = byLabel('Sessions and files', view)
  return Array.from(row.querySelectorAll('li'), (item) => {
    const control = item.querySelector('a, button')
    return control ? accessibleName(control) : ''
  })
}

/** A terminal socket that records what the codec sends, and its close. */
class RecordedSocket implements TerminalSocket {
  binaryType: BinaryType = 'blob'
  readonly readyState = 0
  readonly sent: string[] = []
  closed = false

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }

  addEventListener(): void {}

  removeEventListener(): void {}
}

/**
 * The event source of the fake server with a terminal socket: each open
 * records its path and its subprotocol, as the Worker would get them.
 */
export function socketsOf(server: FakeApiServer) {
  const opened: { path: string; protocol: string; socket: RecordedSocket }[] =
    []
  const events: AppServices['events'] = {
    ...recordingSocket(server).source,
    openSocket: (path, protocol) => {
      const socket = new RecordedSocket()
      opened.push({ path, protocol, socket })
      return socket
    },
  }
  return { events, opened }
}
