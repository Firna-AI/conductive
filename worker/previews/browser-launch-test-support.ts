import { runInNewContext } from 'node:vm'

import { Window } from 'happy-dom'
import { vi } from 'vitest'

export async function runBrowserLaunch(
  html: string,
  authorizer: URL,
  send: (url: URL, init: RequestInit) => Promise<Response>,
) {
  const replace = vi.fn<(url: string) => void>()
  const location = {
    href: authorizer.href,
    hash: authorizer.hash,
    pathname: authorizer.pathname,
    port: authorizer.port,
    replace,
  }
  const history = {
    replaceState: vi.fn((_state: unknown, _title: string, path: string) => {
      const clean = new URL(path, location.href)
      location.href = clean.href
      location.hash = clean.hash
    }),
  }
  const fragments: string[] = []
  const fetch = vi.fn((url: URL, init: RequestInit) => {
    fragments.push(location.hash)
    return send(url, init)
  })
  const window = new Window()
  window.document.body.innerHTML =
    '<span id="title"></span><span id="detail"></span>'
  const script = /<script nonce="[^"]+">([\s\S]*)<\/script>/.exec(html)?.[1]
  if (!script) throw new Error('Missing authorizer script')
  try {
    await runInNewContext(script, {
      URL,
      URLSearchParams,
      location,
      history,
      fetch,
      document: window.document,
    })
    return {
      fetch,
      replace,
      history,
      fragments,
      failed: window.document.body.classList.contains('failed'),
    }
  } finally {
    window.close()
  }
}
