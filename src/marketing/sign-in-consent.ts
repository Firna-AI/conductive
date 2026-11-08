import { signInCopy } from '../../docs/mockups/src/screens/signInCopy'
import { wordmark } from './chrome'
import { pageDocument } from './document'
import { html } from './html'
import { gitHubMark } from './icons'
import { textHtml } from './legal'
import { termsAgreement } from './legal-text'
import { pageHrefs } from './links'
import { contentSecurityPolicy } from './styles'

/**
 * The page before GitHub when a sign-in starts without the agreement to
 * the current terms, such as from the menu of the Mac app. It shows the
 * agreement beside Continue with GitHub, which leads to `continuePath`
 * with the agreement. The links lead to the pages of the site on
 * `marketingOrigin`. The page runs no script and sets no cookie.
 */
export async function termsConsentPage(
  continuePath: string,
  marketingOrigin: string,
): Promise<Response> {
  const hrefs = pageHrefs(marketingOrigin)
  const body = html`<header class="header">
      <div class="header-inner">${wordmark(hrefs.home)}</div>
    </header>
    <main class="main text-page">
      <article class="text-article">
        <header class="text-head">
          <h1 class="text-title">${signInCopy.title}</h1>
          <p class="text-lead">${signInCopy.text}</p>
        </header>
        <div class="intro">
          <p class="intro-text">${textHtml(termsAgreement, hrefs)}</p>
          <div class="actions">
            <a class="button button-primary" href="${continuePath}"
              ><span class="button-icon">${gitHubMark(16)}</span
              ><span>${signInCopy.action}</span></a
            >
          </div>
        </div>
      </article>
    </main>`
  const page = pageDocument(
    {
      title: signInCopy.title,
      description: signInCopy.text,
    },
    body,
  )
  return new Response(page, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': await contentSecurityPolicy(),
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
