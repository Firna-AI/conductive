import { AppModel } from '../../app/app-model'
import { testServices } from '../../app/test-kit'
import type { FakeApiServer } from '../../test-support/fake-api'
import { holdAnimationFrames } from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { textOf } from '../test-render'
import type { Viewport } from '../ui/viewport'

/**
 * Mounts the shell of the app at an address. The shell starts the app, as
 * in a browser, and the first reads answer. The placeholders, the busy
 * buttons, and the charts animate, so the animation frames wait until the
 * test ends.
 */
export async function mountShell(
  server: FakeApiServer,
  href: string,
  options: {
    viewport?: Viewport
    services?: Parameters<typeof testServices>[1]
  } = {},
) {
  holdAnimationFrames()
  const app = new AppModel(testServices(server, options.services))
  const view = mountScreen(app, <Shell />, {
    href,
    viewport: options.viewport,
  })
  await settle()
  return { app, view, text: () => textOf(view.innerHTML) }
}

/**
 * The requests of the operator section, as `METHOD path` lines in their
 * order, with the JSON body of a write.
 */
export async function operatorRequests(
  server: FakeApiServer,
): Promise<string[]> {
  const operator = server.requests.filter((request) =>
    new URL(request.url).pathname.startsWith('/api/operator'),
  )
  return Promise.all(
    operator.map(async (request) => {
      const url = new URL(request.url)
      const body = await request.clone().text()
      const line = `${request.method} ${url.pathname}${url.search}`
      return body === '' ? line : `${line} ${body}`
    }),
  )
}

/** The link of the rail to the operator section, or null. */
export function railOperator(view: HTMLElement): HTMLAnchorElement | null {
  return view.querySelector<HTMLAnchorElement>(
    'nav[aria-label="Orgs"] a[aria-label="Operator"]',
  )
}
