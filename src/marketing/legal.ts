import { productName } from '../../docs/mockups/src/brand'
import { html, type Html } from './html'

/**
 * A fact that the operator or the lawyer still confirms or writes. It shows
 * as marked text, so that no reader takes it for a final fact.
 */
export function draftField(text: string): Html {
  return html`<mark class="draft-field">${text}</mark>`
}

/** One section of a legal page: a heading, and its paragraphs and lists. */
export type LegalSection = { title: string; body: Html }

/** A legal page of the site, such as the terms or the privacy notice. */
export type LegalDocument = {
  title: string
  description: string
  lead: Html
  sections: readonly LegalSection[]
}

/**
 * The notice at the top of each legal page, as decision 35 asks: a lawyer
 * reviews the text before the app opens to other people.
 */
function draftNotice(): Html {
  return html`<div class="draft-notice" role="note">
    <p class="draft-notice-title">Draft for lawyer review</p>
    <p class="draft-notice-text">
      A lawyer reviews this text before ${productName} opens to other people.
      Each marked field waits for a fact that the operator confirms.
    </p>
  </div>`
}

/** The main content of a legal page: its title, the draft notice, and the text. */
export function legalContent(document: LegalDocument): Html {
  const sections = document.sections.map(
    (section) =>
      html`<section class="legal-section">
        <h2 class="legal-heading">${section.title}</h2>
        ${section.body}
      </section>`,
  )
  return html`<main class="main text-page">
    <article class="text-article">
      <header class="text-head">
        <span class="intro-label">Legal</span>
        <h1 class="text-title">${document.title}</h1>
        <p class="text-lead">${document.lead}</p>
      </header>
      ${draftNotice()}${sections}
    </article>
  </main>`
}

/** The main content of the page for an address that the site does not have. */
export function notFoundContent(home: string): Html {
  return html`<main class="main text-page">
    <article class="text-article">
      <header class="text-head">
        <span class="intro-label">Not found</span>
        <h1 class="text-title">Page not found</h1>
        <p class="text-lead">
          Check the address, or go to the
          <a class="text-link" href="${home}">home page</a>.
        </p>
      </header>
    </article>
  </main>`
}
