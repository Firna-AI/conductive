/**
 * Markup that the site trusts, because the `html` tag built it. A string that
 * goes into the tag is text, and the tag escapes it.
 */
export class Html {
  readonly #markup: string

  constructor(markup: string) {
    this.#markup = markup
  }

  toString(): string {
    return this.#markup
  }
}

/** A value that the `html` tag accepts. */
export type HtmlValue =
  Html | string | number | false | null | undefined | readonly HtmlValue[]

const entities: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes text for element content and for quoted attribute values. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => entities[character])
}

function isList(value: HtmlValue): value is readonly HtmlValue[] {
  return Array.isArray(value)
}

function markupOf(value: HtmlValue): string {
  if (value === false || value === null || value === undefined) return ''
  if (value instanceof Html) return value.toString()
  if (isList(value)) return value.map(markupOf).join('')
  return escapeHtml(String(value))
}

/**
 * Builds markup from a template. Each value is escaped as text, unless the
 * tag built it. A list joins its items. `false`, `null`, and `undefined` add
 * nothing, so a condition can leave out a part.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: readonly HtmlValue[]
): Html {
  let markup = strings[0]
  values.forEach((value, index) => {
    markup += markupOf(value) + strings[index + 1]
  })
  return new Html(markup)
}

/**
 * A stylesheet of the site as the content of a `<style>` element. The text
 * of a `<style>` element is not escaped, so it must not close the element.
 */
export function styleElement(css: string): Html {
  if (/<\/style/i.test(css)) {
    throw new Error('A stylesheet must not close its style element.')
  }
  return new Html(`<style>${css}</style>`)
}
