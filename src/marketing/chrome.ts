import { productName } from '../../docs/mockups/src/brand'
import { startButton } from './actions'
import { lockupSize, siteFiles } from './assets'
import { html, type Html } from './html'
import { abuseAddress } from './legal-text'
import { sitePaths, type SiteLinks } from './links'

/**
 * The lockup of the brand, as a link to the home page at `home`. The
 * browser picks the lockup for the colour scheme. The files stay as the
 * brand made them.
 */
export function wordmark(home: string): Html {
  return html`<a class="wordmark" href="${home}"
    ><picture
      ><source
        media="(prefers-color-scheme: light)"
        srcset="${siteFiles.lockup.light}" />
      <img
        src="${siteFiles.lockup.dark}"
        alt="${productName}"
        width="${lockupSize.width}"
        height="${lockupSize.height}" /></picture
  ></a>`
}

/**
 * The top of each page: the lockup, the features, Sign in, and the main
 * action. A phone keeps the lockup and Sign in, because the main action
 * follows at once in the hero.
 */
export function siteHeader(links: SiteLinks): Html {
  return html`<header class="header">
    <div class="header-inner">
      ${wordmark(sitePaths.home)}
      <nav aria-label="Site" class="header-nav">
        <a class="header-link header-wide" href="${links.features}">Features</a
        ><a class="header-link" href="${links.signIn}">Sign in</a
        >${startButton(links, { size: 'md', className: 'header-wide' })}
      </nav>
    </div>
  </header>`
}

function footerColumn(title: string, links: readonly Html[]): Html {
  return html`<div class="footer-column">
    <h2 class="footer-heading">${title}</h2>
    <ul class="footer-links">
      ${links.map((link) => html`<li>${link}</li>`)}
    </ul>
  </div>`
}

/** The legal pages of the site, as decision 35 asks. */
function legalLinks(): Html {
  return html`<nav aria-label="Legal" class="legal-links">
    <a class="legal-link" href="${sitePaths.terms}">Terms</a
    ><a class="legal-link" href="${sitePaths.privacy}">Privacy</a>
  </nav>`
}

/**
 * The foot of each page: the lockup, the sections, the sign-in, the address
 * for abuse reports, and the legal pages beside the copyright.
 */
export function siteFooter(links: SiteLinks, year: number): Html {
  return html`<footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        ${wordmark(sitePaths.home)}
        <p class="footer-tagline">
          Coding agents on cloud computers, in your browser.
        </p>
      </div>
      ${footerColumn('Product', [
        html`<a class="footer-link" href="${links.features}">Features</a>`,
      ])}${footerColumn('Account', [
        html`<a class="footer-link" href="${links.signIn}"
          >Start free with GitHub</a
        >`,
        html`<a class="footer-link" href="${links.signIn}">Sign in</a>`,
      ])}${footerColumn('Report abuse', [
        html`<a class="footer-link" href="mailto:${abuseAddress}"
          >${abuseAddress}</a
        >`,
      ])}
    </div>
    <div class="footer-inner footer-bottom">
      <p class="footer-legal">© ${year} ${productName}</p>
      ${legalLinks()}
    </div>
  </footer>`
}
