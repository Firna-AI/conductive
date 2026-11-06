import { siteFiles } from './assets'
import { html, styleElement, type Html } from './html'
import { siteStylesheet } from './styles'

/** What the head of a page says about it. */
export type PageHead = { title: string; description: string }

/**
 * A whole page of the site: the head with its icons, its font, and its
 * stylesheet, then the body. The page has no script.
 */
export function pageDocument(head: PageHead, body: Html): string {
  const page = html`<html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="color-scheme" content="dark light" />
      <title>${head.title}</title>
      <meta name="description" content="${head.description}" />
      <link rel="icon" href="${siteFiles.favicon.ico}" sizes="32x32" />
      <link rel="icon" href="${siteFiles.favicon.svg}" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="${siteFiles.appleTouchIcon}" />
      <link
        rel="preload"
        href="${siteFiles.font}"
        as="font"
        type="font/woff2"
        crossorigin
      />
      ${styleElement(siteStylesheet())}
    </head>
    <body>
      <div class="site">${body}</div>
    </body>
  </html>`
  return `<!doctype html>\n${page}`
}
