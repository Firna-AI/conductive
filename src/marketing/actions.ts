import { html, type Html } from './html'
import { gitHubMark } from './icons'
import type { SiteLinks } from './links'

/** The main action of the site. The app starts the GitHub sign-up. */
export function startButton(
  links: SiteLinks,
  options: { size: 'md' | 'lg'; className?: string },
): Html {
  const classes = ['button', 'button-primary']
  if (options.size === 'md') classes.push('button-md')
  if (options.className) classes.push(options.className)
  return html`<a class="${classes.join(' ')}" href="${links.signIn}"
    ><span class="button-icon">${gitHubMark(16)}</span
    ><span>Start free with GitHub</span></a
  >`
}

/**
 * The two actions of a section: start free with GitHub, and sign in. Both
 * go to the GitHub sign-in of the app, which also signs up a new user. A
 * phone puts them under each other at full width.
 */
export function siteActions(links: SiteLinks): Html {
  return html`<div class="actions">
    ${startButton(links, { size: 'lg' })}<a
      class="button"
      href="${links.signIn}"
      ><span>Sign in</span></a
    >
  </div>`
}
