/**
 * The named references that the renderer decodes. A map finds no member
 * of a plain object, so `&constructor;` stays as typed.
 */
const namedEntities: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['copy', '©'],
  ['reg', '®'],
  ['trade', '™'],
  ['hellip', '…'],
  ['mdash', '—'],
  ['ndash', '–'],
  ['lsquo', '‘'],
  ['rsquo', '’'],
  ['ldquo', '“'],
  ['rdquo', '”'],
  ['bull', '•'],
  ['middot', '·'],
  ['times', '×'],
])

function codePoint(value: number): string {
  const valid =
    value > 0 && value <= 0x10ffff && (value < 0xd800 || value > 0xdfff)
  return String.fromCodePoint(valid ? value : 0xfffd)
}

/** Decodes the HTML character references that Markdown text can hold. */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z][a-zA-Z\d]{1,31}));/g,
    (match, decimal?: string, hex?: string, name?: string) => {
      if (decimal) return codePoint(Number.parseInt(decimal, 10))
      if (hex) return codePoint(Number.parseInt(hex, 16))
      return (name && namedEntities.get(name)) ?? match
    },
  )
}

const safeProtocols = new Set(['http:', 'https:', 'mailto:'])

/**
 * The address of a link that is safe to follow from untrusted Markdown, or
 * null. Only absolute http, https, and mailto addresses pass. A relative
 * address would resolve against the app, so it shows as text.
 */
export function safeHref(destination: string): string | null {
  const value = decodeEntities(destination).trim()
  if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return null
  try {
    const url = new URL(value)
    return safeProtocols.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

/** The key of a link reference, such as `[docs]`, in any case and spacing. */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase()
}

const definition =
  /^ {0,3}\[([^\]]+)\]:[ \t]*<?([^\s<>]+)>?(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/

/**
 * Takes the link reference definitions, such as `[docs]: https://…`, from
 * the start of a paragraph. Returns the lines that stay.
 */
export function takeDefinitions(
  lines: readonly string[],
  definitions: Map<string, string>,
): readonly string[] {
  let index = 0
  for (; index < lines.length; index += 1) {
    const match = definition.exec(lines[index])
    if (!match) break
    const key = normalizeLabel(match[1])
    if (key !== '' && !definitions.has(key)) definitions.set(key, match[2])
  }
  return lines.slice(index)
}
