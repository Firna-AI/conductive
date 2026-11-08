import { productName } from '../../docs/mockups/src/brand'
import {
  githubSetupCopy,
  type GitHubSetupOutcome,
} from '../../docs/mockups/src/screens/githubSetupCopy'
import { wordmark } from './chrome'
import { pageDocument } from './document'
import { html } from './html'
import { pageHrefs } from './links'
import { contentSecurityPolicy } from './styles'

/**
 * The page back from GitHub after an install of the GitHub App that started
 * in the Mac app. It sends the user back to the Mac app, because this
 * browser has no sign-in of the Mac app. The wordmark leads to the home
 * page of the site on `marketingOrigin`. The page runs no script and sets
 * no cookie.
 */
export async function githubSetupPage(
  outcome: GitHubSetupOutcome,
  marketingOrigin: string,
): Promise<Response> {
  const copy = githubSetupCopy[outcome]
  const hrefs = pageHrefs(marketingOrigin)
  const body = html`<header class="header">
      <div class="header-inner">${wordmark(hrefs.home)}</div>
    </header>
    <main class="main text-page">
      <article class="text-article">
        <header class="text-head">
          <h1 class="text-title">${copy.title}</h1>
          <p class="text-lead">${copy.text}</p>
        </header>
      </article>
    </main>`
  const page = pageDocument(
    { title: `${copy.title} – ${productName}`, description: copy.text },
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
