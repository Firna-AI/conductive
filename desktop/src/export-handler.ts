import { extname, resolve, sep } from 'node:path'
import type { Protocol } from 'electron'

import {
  DESKTOP_SCHEME,
  isDesktopAddress,
} from '../../worker/security/desktop-contract.js'

export interface ExportFiles {
  realpath(path: string): Promise<string>
  stat(path: string): Promise<{ isFile(): boolean }>
  read(path: string): Promise<Uint8Array>
}

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
}

export function registerScheme(
  protocol: Pick<Protocol, 'registerSchemesAsPrivileged'>,
): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: DESKTOP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ])
}

function inside(root: string, file: string): boolean {
  return file === root || file.startsWith(root + sep)
}

/** Real-path admission prevents a bundled symlink from exposing arbitrary files. */
export function exportHandler(
  files: ExportFiles,
  root: string,
  policy: string,
) {
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({
      'Content-Security-Policy': policy,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    })
    const reply = (status: number, body: BodyInit | null = null) =>
      new Response(body, { status, headers })
    if (!['GET', 'HEAD'].includes(request.method)) {
      headers.set('Allow', 'GET, HEAD')
      return reply(405)
    }
    try {
      const url = new URL(request.url)
      if (!isDesktopAddress(url)) return reply(404)
      const path = decodeURIComponent(url.pathname)
      if (path.includes('\\') || path.includes('\0')) return reply(404)
      const file = resolve(root, `.${path}`)
      if (!inside(root, file)) return reply(404)
      const realRoot = await files.realpath(root)
      let realFile: string
      try {
        realFile = await files.realpath(file)
        if (!inside(realRoot, realFile)) return reply(404)
        if (!(await files.stat(realFile)).isFile())
          throw Object.assign(new Error(), { code: 'ENOENT' })
      } catch (error) {
        if (
          typeof error !== 'object' ||
          error === null ||
          !('code' in error) ||
          !['ENOENT', 'ENOTDIR'].includes(String(error.code))
        )
          throw error
        if (extname(path)) return reply(404)
        realFile = await files.realpath(resolve(root, 'index.html'))
        if (!inside(realRoot, realFile)) return reply(404)
      }
      headers.set(
        'Content-Type',
        mime[extname(realFile)] ?? 'application/octet-stream',
      )
      if (request.method === 'HEAD') return reply(200)
      const bytes = await files.read(realFile)
      return reply(200, new Uint8Array(bytes))
    } catch (error) {
      return reply(error instanceof URIError ? 400 : 500)
    }
  }
}
