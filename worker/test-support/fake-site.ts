import { createHash } from 'node:crypto'

import {
  SITE_FILE_LIST,
  SITE_FOLDER,
  SITE_MARKERS,
  TERMS_CONSENT_PAGE,
  type SiteFile,
} from '../../src/shared/site-build'
import { SiteBinding, type SiteAssetFile } from './site-binding'

export const FAKE_PICTURE = `/${SITE_FOLDER}/_astro/picture.webp`
export const FILE_LIST_PATH = `/${SITE_FOLDER}/${SITE_FILE_LIST}`
const css = 'body{color:green}'

/** A small build. The binding still has the app's successful HTML fallback. */
export function fakeSite(styles: readonly string[] = [css]) {
  const files = new Map<string, SiteAssetFile>()
  const list: SiteFile[] = []
  const add = (path: string, body: string, contentType: string) => {
    files.set(`/${SITE_FOLDER}/${path}`, { body, contentType })
    list.push(
      path.endsWith('.html')
        ? {
            path,
            styleHashes: styles.map((style) =>
              createHash('sha256').update(style).digest('base64'),
            ),
          }
        : { path },
    )
  }
  const document = (body: string) =>
    `<!doctype html><html><head>${styles.map((style) => `<style>${style}</style>`).join('')}</head><body>${body}</body></html>`
  const footer = `<footer>© ${SITE_MARKERS.year} Conductive</footer>`
  const link = `<a href="${SITE_MARKERS.appOrigin}/">Sign in</a>`
  add(
    'index.html',
    document(
      `Home <h1>Give every coding task its own cloud computer.</h1>${link}${footer}`,
    ),
    'text/html',
  )
  add('terms.html', document(`Terms ${link}${footer}`), 'text/html')
  add('404.html', document(`Page not found ${link}${footer}`), 'text/html')
  add(
    TERMS_CONSENT_PAGE,
    document(
      `<a href="${SITE_MARKERS.continueAddress}">Continue with GitHub</a><a href="${SITE_MARKERS.siteOrigin}/terms">Terms</a><a href="${SITE_MARKERS.siteOrigin}/privacy">Privacy</a>`,
    ),
    'text/html',
  )
  add('_astro/picture.webp', 'picture', 'image/webp')
  add('favicon.ico', 'icon', 'image/x-icon')
  files.set(FILE_LIST_PATH, {
    body: JSON.stringify({ files: list }),
    contentType: 'application/json',
  })
  return new SiteBinding(files)
}
