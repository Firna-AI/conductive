import { execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:https'
import { resolve } from 'node:path'

import {
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
} from '../../worker/security/desktop-contract.js'
import { PREVIEW_HANDOFF_PATH } from '../../worker/security/preview-launch-path.js'
import { previewBrowserDocument } from '../../worker/previews/browser-launch.js'
import { previewLaunchDocument } from '../../worker/previews/launch-document.js'

export async function createPreviewServer(directory: string) {
  const key = resolve(directory, 'key.pem')
  const cert = resolve(directory, 'cert.pem')
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      key,
      '-out',
      cert,
      '-subj',
      '/CN=app.conductive.test',
      '-days',
      '1',
    ],
    { stdio: 'ignore' },
  )
  const requests: {
    host: string
    path: string
    origin: string | undefined
    cookie: string
    authorization: string | undefined
    accept: string | undefined
  }[] = []
  const hostname = '0123456789abcdef0123456789abcdef.conductive-previews.test'
  let appOrigin = ''
  let authorizer = ''
  let preview = ''
  let reject = false
  const launcherPath = '/api/orgs/org/workspaces/workspace/previews/preview'
  const token = 'fixture-preview-grant'
  const server = createServer(
    { key: await readFile(key), cert: await readFile(cert) },
    (incoming, outgoing) => {
      void (async () => {
        const url = new URL(
          incoming.url ?? '/',
          `https://${incoming.headers.host}`,
        )
        const cookie = incoming.headers.cookie ?? ''
        requests.push({
          host: url.hostname,
          path: url.pathname + url.search,
          origin: incoming.headers.origin,
          cookie,
          authorization: incoming.headers.authorization,
          accept: incoming.headers.accept,
        })
        outgoing.setHeader('Cache-Control', 'no-store')
        outgoing.setHeader('Referrer-Policy', 'no-referrer')
        const json = (status: number, body: unknown) => {
          outgoing.writeHead(status, { 'Content-Type': 'application/json' })
          outgoing.end(JSON.stringify(body))
        }
        if (url.origin === appOrigin && url.pathname === launcherPath) {
          if (incoming.headers.origin === DESKTOP_ORIGIN) {
            outgoing.setHeader('Access-Control-Allow-Origin', DESKTOP_ORIGIN)
            outgoing.setHeader('Access-Control-Allow-Credentials', 'true')
            outgoing.setHeader('Vary', 'Origin')
          }
          if (cookie !== `${DESKTOP_SESSION_COOKIE}=mac-session`)
            return json(401, {})
          if (incoming.headers.accept === 'application/json') {
            if (incoming.headers.origin !== DESKTOP_ORIGIN) return json(403, {})
            return json(200, {
              url:
                authorizer +
                '#' +
                new URLSearchParams({ hostname, grant: token }),
              expiresAt: Date.now() + 60_000,
            })
          }
          const document = previewLaunchDocument({
            action: authorizer,
            hostname,
            grant: token,
            nonce: 'preview-fixture',
            appOrigin,
            desktopOrigin: DESKTOP_ORIGIN,
          })
          outgoing.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': document.policy,
            'Referrer-Policy': 'origin',
          })
          outgoing.end(document.html)
          return
        }
        if (
          url.origin === new URL(authorizer).origin &&
          url.pathname === PREVIEW_HANDOFF_PATH
        ) {
          if (incoming.method === 'GET') {
            const document = previewBrowserDocument('preview-fixture')
            outgoing.writeHead(200, {
              'Content-Type': 'text/html',
              'Content-Security-Policy': document.policy,
            })
            outgoing.end(document.html)
            return
          }
          let text = ''
          for await (const chunk of incoming) text += String(chunk)
          const fields = new URLSearchParams(text)
          const header = incoming.headers.authorization
          const origin = header ? new URL(authorizer).origin : appOrigin
          const grant = header
            ? header.replace(/^Bearer /, '')
            : fields.get('grant')
          const target = header
            ? url.searchParams.get('hostname')
            : fields.get('hostname')
          if (
            reject ||
            incoming.headers.origin !== origin ||
            grant !== token ||
            target !== hostname
          )
            return json(404, {})
          outgoing.setHeader(
            'Set-Cookie',
            '__Secure-conductive-preview-preview=preview-cookie; Domain=conductive-previews.test; Path=/; HttpOnly; Secure; SameSite=None; Partitioned',
          )
          if (header) return json(200, { url: preview })
          outgoing.writeHead(303, { Location: preview })
          outgoing.end()
          return
        }
        if (
          url.hostname === hostname &&
          cookie.includes('__Secure-conductive-preview-preview=preview-cookie')
        ) {
          outgoing.writeHead(200, { 'Content-Type': 'text/html' })
          outgoing.end(
            `<h1>Preview ready</h1><a target="_blank" href="${appOrigin}${launcherPath}">Open app popup</a><a target="_blank" href="https://example.com/preview-marker">Mark child popup</a>`,
          )
          return
        }
        json(404, {})
      })().catch(() => {
        outgoing.writeHead(500)
        outgoing.end()
      })
    },
  )
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Preview server has no TCP port')
  appOrigin = `https://app.conductive.test:${address.port}`
  authorizer = `https://authorize.conductive-previews.test:${address.port}${PREVIEW_HANDOFF_PATH}`
  preview = `https://${hostname}:${address.port}/`
  return {
    appOrigin,
    authorizer,
    preview,
    requests,
    launcher: appOrigin + launcherPath,
    frames: [`https://*.conductive-previews.test:${address.port}`],
    reject: () => {
      reject = true
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
