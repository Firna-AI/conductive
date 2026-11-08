import { html, type Html } from './html'
import {
  draftNotice,
  legalLabel,
  notFoundText,
  type Block,
  type LegalDocument,
  type SitePage,
  type Text,
} from './legal-text'
import { pageHrefs } from './links'

/**
 * A fact that the operator or the lawyer still confirms or writes. It shows
 * as marked text, so that no reader takes it for a final fact.
 */
export function draftField(text: string): Html {
  return html`<mark class="draft-field">${text}</mark>`
}

/** The address of each page of the site that running text links to. */
export type PageHrefs = Readonly<Record<SitePage, string>>

/** The pages of the site on the site itself. */
const sitePageHrefs = pageHrefs()

/** Running text as markup: its words, its draft fields, and its links. */
export function textHtml(text: Text, hrefs: PageHrefs = sitePageHrefs): Html {
  return html`${text.map((part) => {
    if (typeof part === 'string') return part
    if ('draft' in part) return draftField(part.draft)
    const href = 'page' in part ? hrefs[part.page] : `mailto:${part.mail}`
    return html`<a class="text-link" href="${href}">${part.text}</a>`
  })}`
}

function blockHtml(block: Block): Html {
  if (block.kind === 'paragraph') return html`<p>${textHtml(block.text)}</p>`
  return html`<ul>
    ${block.items.map((item) => html`<li>${textHtml(item)}</li>`)}
  </ul>`
}

/** The notice at the top of each legal page: a lawyer reviews the text. */
function draftNoticeHtml(): Html {
  return html`<div class="draft-notice" role="note">
    <p class="draft-notice-title">${draftNotice.title}</p>
    <p class="draft-notice-text">${draftNotice.text}</p>
  </div>`
}

/** The main content of a legal page: its title, the draft notice, and the text. */
export function legalContent(document: LegalDocument): Html {
  const sections = document.sections.map(
    (section) =>
      html`<section class="legal-section">
        <h2 class="legal-heading">${section.title}</h2>
        ${section.blocks.map(blockHtml)}
      </section>`,
  )
  return html`<main class="main text-page">
    <article class="text-article">
      <header class="text-head">
        <span class="intro-label">${legalLabel}</span>
        <h1 class="text-title">${document.title}</h1>
        <p class="text-lead">${textHtml(document.lead)}</p>
      </header>
      ${draftNoticeHtml()}${sections}
    </article>
  </main>`
}

/** The main content of the page for an address that the site does not have. */
export function notFoundContent(): Html {
  return html`<main class="main text-page">
    <article class="text-article">
      <header class="text-head">
        <span class="intro-label">${notFoundText.label}</span>
        <h1 class="text-title">${notFoundText.title}</h1>
        <p class="text-lead">${textHtml(notFoundText.lead)}</p>
      </header>
    </article>
  </main>`
}
