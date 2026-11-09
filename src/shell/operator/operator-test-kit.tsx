import { AppModel } from '../../app/app-model'
import { routes } from '../../app/router'
import { testServices } from '../../app/test-kit'
import {
  operatorUserPath,
  type OperatorUserDetail,
} from '../../shared/operator'
import { operatorSignupPausePath } from '../../shared/operator-waitlist'
import { FakeApiServer } from '../../test-support/fake-api'
import { holdAnimationFrames } from '../../test-support/mount'
import { serveOperator } from '../../test-support/operator'
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
 * The page of a sample user, with its first read. The page gets the detail
 * of the samples, or the change that `change` makes to it. `header` gives
 * the text of the header of the page.
 */
export async function openUser(
  githubId: number,
  options: {
    viewport?: Viewport
    change?: (user: OperatorUserDetail) => OperatorUserDetail
    services?: Parameters<typeof testServices>[1]
  } = {},
) {
  const server = new FakeApiServer()
  const fixtures = serveOperator(server)
  const sample = fixtures.users.find((item) => item.githubId === githubId)
  if (!sample) throw new Error(`The samples have no user ${githubId}.`)
  const user = options.change ? options.change(sample) : sample
  server.json('GET', operatorUserPath(githubId), user)
  const shell = await mountShell(server, routes.operatorUser(githubId), {
    viewport: options.viewport,
    services: options.services,
  })
  const header = () =>
    textOf(shell.view.querySelector('main header')?.innerHTML ?? '')
  return { server, user, header, ...shell }
}

/** The box of the page with the title, or null without one. */
export function boxOf(view: HTMLElement, title: string): HTMLElement | null {
  const found = Array.from(view.querySelectorAll('main section')).find(
    (item) => item.querySelector('h2')?.textContent === title,
  )
  return found instanceof HTMLElement ? found : null
}

/** The text of the box of the page with the title, or null without one. */
export function boxText(view: HTMLElement, title: string): string | null {
  const box = boxOf(view, title)
  return box ? textOf(box.innerHTML) : null
}

/** Whether a request is a read of the pause, which each page sends when it opens. */
function readsPause(request: Request): boolean {
  const path = new URL(request.url).pathname
  return request.method === 'GET' && path === operatorSignupPausePath()
}

/**
 * The requests of the operator section, as `METHOD path` lines in their
 * order, with the JSON body of a write. The reads of the pause stay out,
 * unless `pause` asks for them.
 */
export async function operatorRequests(
  server: FakeApiServer,
  options: { pause?: boolean } = {},
): Promise<string[]> {
  const operator = server.requests.filter(
    (request) =>
      new URL(request.url).pathname.startsWith('/api/operator') &&
      (options.pause === true || !readsPause(request)),
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
