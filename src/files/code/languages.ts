/** The syntax rules of one language family, for the code view. */
export interface Language {
  lineComments: readonly string[]
  blockComments: readonly (readonly [string, string])[]
  /** Openers and closers of strings. Multi-line strings can span lines. */
  strings: readonly { open: string; close: string; multiline: boolean }[]
  keywords: ReadonlySet<string>
  /** Keywords match in any case, as in SQL. */
  anyCase: boolean
  /** Names that start with a capital letter show as types. */
  capitalTypes: boolean
}

function words(list: string): ReadonlySet<string> {
  return new Set(list.split(/\s+/).filter(Boolean))
}

const quotes = [
  { open: '"', close: '"', multiline: false },
  { open: "'", close: "'", multiline: false },
]

const cStyle = {
  lineComments: ['//'],
  blockComments: [['/*', '*/']] as const,
  anyCase: false,
  capitalTypes: true,
}

const script: Language = {
  ...cStyle,
  strings: [...quotes, { open: '`', close: '`', multiline: true }],
  keywords: words(`abstract as async await break case catch class const
    continue debugger declare default delete do else enum export extends
    false finally for from function get if implements import in infer
    instanceof interface keyof let namespace new null of private protected
    public readonly return satisfies set static super switch this throw true
    try type typeof undefined var void while with yield`),
}

const cFamily: Language = {
  ...cStyle,
  strings: [...quotes, { open: '`', close: '`', multiline: true }],
  keywords: words(`abstract auto bool boolean break byte case catch char
    chan class const continue def default defer delete do double else enum
    extends extern false final finally float fn for func go goto if impl
    implements import in int interface internal let long loop match mod mut
    namespace new nil null object override package private protected pub
    public return select self short signed sizeof static struct super switch
    this throw throws trait true try type typedef union unsigned use using val
    var virtual void volatile when where while`),
}

const hashComments = {
  blockComments: [],
  anyCase: false,
  capitalTypes: false,
}

const python: Language = {
  ...hashComments,
  lineComments: ['#'],
  strings: [
    { open: '"""', close: '"""', multiline: true },
    { open: "'''", close: "'''", multiline: true },
    ...quotes,
  ],
  keywords: words(`and as assert async await break class continue def del
    elif else except False finally for from global if import in is lambda
    None nonlocal not or pass raise return True try while with yield`),
  capitalTypes: true,
}

const shell: Language = {
  ...hashComments,
  lineComments: ['#'],
  strings: quotes,
  keywords: words(`case do done elif else esac export fi for function if in
    local return then until while`),
}

const data: Language = {
  ...hashComments,
  lineComments: ['#'],
  strings: quotes,
  keywords: words('true false null yes no on off'),
}

const ruby: Language = {
  ...shell,
  keywords: words(`begin class def do else elsif end ensure false if module
    nil require rescue return self then true unless until when while yield`),
  capitalTypes: true,
}

const sql: Language = {
  lineComments: ['--'],
  blockComments: [['/*', '*/']],
  strings: [{ open: "'", close: "'", multiline: true }],
  keywords: words(`add alter and as asc by create default delete desc distinct
    drop exists foreign from group having in index insert into is join key
    left limit not null on or order primary references right select set table
    update values where with`),
  anyCase: true,
  capitalTypes: false,
}

const css: Language = {
  lineComments: [],
  blockComments: [['/*', '*/']],
  strings: quotes,
  keywords: words('important'),
  anyCase: false,
  capitalTypes: false,
}

const markup: Language = {
  lineComments: [],
  blockComments: [['<!--', '-->']],
  strings: quotes,
  keywords: new Set(),
  anyCase: false,
  capitalTypes: false,
}

const byExtension: Readonly<Record<string, Language>> = {
  ts: script,
  tsx: script,
  mts: script,
  cts: script,
  js: script,
  jsx: script,
  mjs: script,
  cjs: script,
  json: { ...script, keywords: words('true false null') },
  c: cFamily,
  h: cFamily,
  cc: cFamily,
  cpp: cFamily,
  hpp: cFamily,
  cs: cFamily,
  go: cFamily,
  java: cFamily,
  kt: cFamily,
  rs: cFamily,
  scala: cFamily,
  swift: cFamily,
  dart: cFamily,
  prisma: cFamily,
  py: python,
  rb: ruby,
  sh: shell,
  bash: shell,
  zsh: shell,
  env: shell,
  yml: data,
  yaml: data,
  toml: data,
  sql,
  css,
  scss: { ...css, lineComments: ['//'] },
  less: { ...css, lineComments: ['//'] },
  html: markup,
  xml: markup,
  svg: markup,
  vue: markup,
}

const byName: Readonly<Record<string, Language>> = {
  dockerfile: shell,
  makefile: shell,
  '.gitignore': shell,
  '.npmrc': shell,
  '.nvmrc': shell,
}

/** The language of a file name, or null when the view shows plain text. */
export function languageOf(name: string): Language | null {
  const lower = name.toLowerCase()
  const named = byName[lower]
  if (named) return named
  if (lower.startsWith('.env')) return shell
  const dot = lower.lastIndexOf('.')
  return dot < 0 ? null : (byExtension[lower.slice(dot + 1)] ?? null)
}
