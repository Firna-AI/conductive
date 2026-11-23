import path from 'node:path'

import { format } from 'prettier'

import {
  tokenTypes,
  type StyleValue,
  type Styles,
  type TokenType,
} from './style-values.ts'

const identifier = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u

function nameFor(file: string) {
  const parts = path
    .basename(file, '.module.css')
    .split(/[^\p{ID_Continue}]+|_/u)
    .filter(Boolean)
  const [first = 'module', ...rest] = parts
  const base = first.replace(
    /^[A-Z]+(?=[A-Z][a-z]|[^a-z]|$)|^[A-Z]/,
    (prefix) => prefix.toLowerCase(),
  )
  const name = `${base}${rest.map((part) => part[0].toUpperCase() + part.slice(1)).join('')}Styles`
  return identifier.test(name) ? name : `_${name}`
}

function classKey(name: string): string {
  if (name === '__proto__') return "['__proto__']"
  return identifier.test(name) ? name : JSON.stringify(name)
}

function code(value: StyleValue): string {
  if (typeof value !== 'object' || Array.isArray(value))
    return JSON.stringify(value)
  if (value.kind === 'token') return `t.${value.name}`
  if (value.kind === 'offset')
    return `{width: ${value.width}, height: ${value.height}}`
  const text = value.parts
    .map((part) => {
      if (typeof part !== 'string') return '${t.' + part.name + '}'
      return part
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
    })
    .join('')
  return '`' + text + '`'
}

export async function renderDraft(
  file: string,
  styles: Styles,
): Promise<string> {
  const types = new Map<string, TokenType>()
  const classes: string[] = []
  for (const [name, style] of styles) {
    const entries: string[] = []
    for (const [key, value] of style) {
      for (const [token, type] of tokenTypes(key, value)) types.set(token, type)
      entries.push(`${key}: ${code(value)}`)
    }
    classes.push(`${classKey(name)}: {${entries.join(', ')}}`)
  }
  const properties = [...types.keys()]
    .sort()
    .map((name) => `readonly ${name}: ${types.get(name)}`)
  const source = file.replace(/\*\//g, '* /').replace(/[\r\n]/g, ' ')
  const lines = [
    '/**',
    ` * Draft from ${source}.`,
    ' * The report of this run lists the rules that the draft leaves out.',
    ' */',
  ]
  if (properties.length > 0)
    lines.push('type Tokens = {', ...properties, '}', '')
  lines.push(
    `export function ${nameFor(file)}(${types.size > 0 ? 't: Tokens' : ''}) {`,
    `return {${classes.join(', ')}} as const`,
    '}',
  )
  return format(lines.join('\n'), {
    parser: 'typescript',
    semi: false,
    singleQuote: true,
  })
}
