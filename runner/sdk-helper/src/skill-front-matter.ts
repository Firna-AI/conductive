/** A top-level value of the front matter. Lists, maps, and tags are other. */
export type FrontMatterValue =
  { kind: 'text'; text: string } | { kind: 'null' } | { kind: 'other' }

export interface FrontMatter {
  /** Null when the file starts with no front matter block. */
  fields: ReadonlyMap<string, FrontMatterValue> | null
  /** True when the block holds YAML that this reader cannot read. */
  invalid: boolean
  /** The text after the block, or the whole text without a block. */
  body: string
}

const BLOCK = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/
const KEY = /^([A-Za-z0-9_][\w.-]*)[ \t]*:(?:[ \t]+(.*))?$/
const BLOCK_SCALAR = /^([|>])([+-]?)([1-9]?)([+-]?)[ \t]*(?:#.*)?$/

class InvalidYaml extends Error {}

/**
 * Reads the YAML front matter of a `SKILL.md` as the agents use it: only
 * the top-level scalar fields. It needs no YAML package.
 */
export function readFrontMatter(source: string): FrontMatter {
  const text = source.replace(/^\uFEFF/, '')
  const match = BLOCK.exec(text)
  if (!match) return { fields: null, invalid: false, body: text }
  const body = text.slice(match[0].length)
  try {
    return { fields: fields(match[1] ?? ''), invalid: false, body }
  } catch (error) {
    if (!(error instanceof InvalidYaml)) throw error
    return { fields: new Map(), invalid: true, body }
  }
}

function fields(block: string): Map<string, FrontMatterValue> {
  const result = new Map<string, FrontMatterValue>()
  const lines = block.split(/\r?\n/)
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const key = KEY.exec(line)
    if (!key || /^\s/.test(line)) throw new InvalidYaml()
    const rest: string[] = []
    while (index + 1 < lines.length && !/^[^\s#]/.test(lines[index + 1]))
      rest.push(lines[++index])
    result.set(key[1], value((key[2] ?? '').trimEnd(), rest))
  }
  return result
}

function value(first: string, rest: readonly string[]): FrontMatterValue {
  const more = rest.filter((line) => line.trim() && !/^\s*#/.test(line))
  if (!first) {
    if (!more.length) return { kind: 'null' }
    const head = more[0].trim()
    if (head === '-' || head.startsWith('- ') || KEY.test(head))
      return { kind: 'other' }
    return plain(rest)
  }
  const header = BLOCK_SCALAR.exec(first)
  if (header) return block(header, rest)
  if (first.startsWith('"') || first.startsWith("'"))
    return { kind: 'text', text: quoted([first, ...rest]) }
  if (/^[[{&*!%@`]/.test(first)) return { kind: 'other' }
  return plain([first, ...rest])
}

function plain(lines: readonly string[]): FrontMatterValue {
  const text = fold(
    lines
      .filter((line) => !/^\s*#/.test(line))
      .map((line) => line.trim().replace(/[ \t]+#.*$/, '')),
  )
  if (/^(?:~|null|Null|NULL)?$/.test(text)) return { kind: 'null' }
  return { kind: 'text', text }
}

/** Joins lines with a space. Each empty line between them is a line break. */
function fold(lines: readonly string[]): string {
  let text = ''
  let breaks = 0
  for (const line of lines) {
    if (!line) {
      breaks++
      continue
    }
    if (text) text += breaks ? '\n'.repeat(breaks) : ' '
    text += line
    breaks = 0
  }
  return text.trim()
}

function quoted(lines: readonly string[]): string {
  const joined = fold(lines.map((line) => line.trim()))
  const mark = joined[0]
  let text = ''
  for (let index = 1; index < joined.length; index++) {
    const char = joined[index]
    if (mark === "'" && char === "'") {
      if (joined[index + 1] === "'") {
        text += "'"
        index++
        continue
      }
      return closed(text, joined.slice(index + 1))
    }
    if (mark === '"' && char === '"')
      return closed(text, joined.slice(index + 1))
    if (mark === '"' && char === '\\') {
      const [escaped, length] = escape(joined, index + 1)
      text += escaped
      index += length
      continue
    }
    text += char
  }
  throw new InvalidYaml()
}

function closed(text: string, after: string): string {
  if (after.trim() && !/^\s+#/.test(after)) throw new InvalidYaml()
  return text
}

const ESCAPES: Readonly<Record<string, string>> = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  '\t': '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\x85',
  _: '\xa0',
  L: ' ',
  P: ' ',
}

function escape(text: string, start: number): [string, number] {
  const char = text[start]
  const simple = ESCAPES[char]
  if (simple !== undefined) return [simple, 1]
  const digits = char === 'x' ? 2 : char === 'u' ? 4 : char === 'U' ? 8 : 0
  const hex = text.slice(start + 1, start + 1 + digits)
  if (!digits || !new RegExp(`^[0-9a-fA-F]{${digits}}$`).test(hex))
    throw new InvalidYaml()
  const point = Number.parseInt(hex, 16)
  if (point > 0x10ffff) throw new InvalidYaml()
  return [String.fromCodePoint(point), digits + 1]
}

function block(
  header: RegExpExecArray,
  rest: readonly string[],
): FrontMatterValue {
  const chomp = header[2] || header[4]
  const firstIndent = rest.find((line) => line.trim())?.match(/^ */)?.[0]
  const indent = header[3] ? Number(header[3]) : (firstIndent?.length ?? 0)
  const lines = rest.map((line) => line.slice(indent).replace(/^\s+$/, ''))
  while (lines.length && !lines[lines.length - 1]) lines.pop()
  const trailing = rest.length - lines.length
  let text = header[1] === '|' ? lines.join('\n') : foldBlock(lines)
  if (chomp === '+') text += '\n'.repeat(Math.max(trailing, 0) + 1)
  else if (chomp !== '-' && text) text += '\n'
  return { kind: 'text', text }
}

/** Folds a `>` block. More-indented lines and empty lines keep breaks. */
function foldBlock(lines: readonly string[]): string {
  let text = ''
  let previous: string | null = null
  for (const line of lines) {
    if (previous === null) text = line
    else if (!line) text += '\n'
    else if (!previous) text += line
    else if (/^\s/.test(line) || /^\s/.test(previous)) text += `\n${line}`
    else text += ` ${line}`
    previous = line
  }
  return text
}
