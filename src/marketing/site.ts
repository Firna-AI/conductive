import { productName } from '../../docs/mockups/src/brand'
import { siteFooter, siteHeader } from './chrome'
import { pageDocument, type PageHead } from './document'
import { homeContent } from './home'
import { html, type Html } from './html'
import { legalContent, notFoundContent } from './legal'
import type { LegalDocument } from './legal-text'
import { siteLinks, sitePaths, type SiteLinks } from './links'
import { privacyDocument } from './privacy'
import { contentSecurityPolicy } from './styles'
import { termsDocument } from './terms'

/** What a page of the site needs from the request and the Worker. */
export type SiteContext = {
  /** The origin of the app, where every sign-in link leads. */
  appOrigin: string
  /** The year of the copyright line. */
  year: number
}

/** A rendered page of the site, with the policy that its HTML needs. */
export type SitePage = {
  status: 200 | 404
  html: string
  contentSecurityPolicy: string
}

type PageDefinition = {
  head: PageHead
  content: (links: SiteLinks) => Html
}

function legalPage(document: LegalDocument): PageDefinition {
  return {
    head: {
      title: `${document.title} – ${productName}`,
      description: document.description,
    },
    content: () => legalContent(document),
  }
}

const pages = new Map<string, PageDefinition>([
  [
    sitePaths.home,
    {
      head: {
        title: `${productName} – Coding agents on cloud computers, in your browser`,
        description:
          'Agents powered by Claude and Codex work on their own branch, in a full clone of your repository. You follow along and review the work from any browser.',
      },
      content: homeContent,
    },
  ],
  [sitePaths.terms, legalPage(termsDocument)],
  [sitePaths.privacy, legalPage(privacyDocument)],
])

const notFoundPage: PageDefinition = {
  head: {
    title: `Page not found – ${productName}`,
    description: `This address is not a page of ${productName}.`,
  },
  content: () => notFoundContent(),
}

/**
 * The page of the marketing site at a path: the home page, the terms, the
 * privacy notice, or the page for an unknown address.
 */
export async function sitePage(
  pathname: string,
  context: SiteContext,
): Promise<SitePage> {
  const page = pages.get(pathname)
  const definition = page ?? notFoundPage
  const links = siteLinks(context.appOrigin)
  const body = html`${siteHeader(links)}${definition.content(links)}${siteFooter(links, context.year)}`
  return {
    status: page ? 200 : 404,
    html: pageDocument(definition.head, body),
    contentSecurityPolicy: await contentSecurityPolicy(),
  }
}
