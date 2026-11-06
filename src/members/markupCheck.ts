import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

/** The visible text of the markup, with the HTML entities decoded. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * A test helper: renders the element to markup, then gives each expected
 * string that the markup and its text lack, and each unwanted one that they
 * have. A string can be visible text or an attribute, such as an
 * `aria-label`.
 */
export function check(
  element: ReactElement,
  present: readonly string[],
  absent: readonly string[],
) {
  const html = renderToStaticMarkup(element)
  const all = `${html} ${text(html)}`
  return {
    missing: present.filter((item) => !all.includes(item)),
    unwanted: absent.filter((item) => all.includes(item)),
  }
}
