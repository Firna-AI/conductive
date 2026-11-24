import { transform, type Rule } from 'lightningcss'

import {
  skipTrivia,
  sourceParts,
  splitCss,
  withoutComments,
  type SourcePart,
} from './css-text.ts'
import { declarationNamesAgree } from './declaration-names.ts'
import type { Reason } from './reasons.ts'
import { selectorReasons } from './selectors.ts'

type SourceLocation = { line: number; selector: string }
export type CssDeclaration = {
  line: number
  offset: number
  text: string
  name: string
  value: string
  important: boolean
}
type CssRule = SourceLocation & {
  className?: string
  reasons: Reason[]
  declarations: CssDeclaration[]
  detail?: string
}

type CssFile = { rules: CssRule[]; readable: boolean }
type LineAt = (offset: number) => number

function lineReader(lines: number[]): LineAt {
  return (offset) => {
    let first = 0
    let last = lines.length
    while (last - first > 1) {
      const middle = Math.floor((first + last) / 2)
      if (lines[middle] <= offset) first = middle
      else last = middle
    }
    return first + 1
  }
}

function declaration(
  part: SourcePart,
  lineAt: LineAt,
): CssDeclaration | undefined {
  if (part.children || part.text.startsWith('@')) return undefined
  const text = withoutComments(part.text)
  const colon = text.indexOf(':')
  if (colon === -1) return undefined
  const name = text.slice(0, colon).trim()
  if (!name) return undefined
  const value = text.slice(colon + 1).trim()
  const flag = /!\s*important$/i
  return {
    line: lineAt(part.offset),
    offset: part.offset,
    text: part.text,
    name: name.startsWith('--') ? name : name.toLowerCase(),
    value: value.replace(flag, '').trimEnd(),
    important: flag.test(value),
  }
}

function sourceSelectors(part: SourcePart, lineAt: LineAt): SourceLocation[] {
  let offset = part.offset
  const selectors = splitCss(part.text, ',').flatMap((text) => {
    const start = skipTrivia(text)
    const selector = text.slice(start).trimEnd()
    const line = lineAt(offset + start)
    offset += text.length + 1
    return selector ? [{ line, selector }] : []
  })
  if (selectors.length > 0) return selectors
  return [{ line: lineAt(part.offset), selector: '(empty selector)' }]
}

function allDeclarations(
  parts: SourcePart[],
  lineAt: LineAt,
): CssDeclaration[] {
  return parts.flatMap((part) => {
    if (part.children) {
      const contents = allDeclarations(part.children, lineAt)
      return part.text.startsWith('@')
        ? contents
        : sourceSelectors(part, lineAt).flatMap(() => contents)
    }
    const item = declaration(part, lineAt)
    return item ? [item] : []
  })
}

function indexRules(rules: Rule[], lines: number[], index: Map<number, Rule>) {
  for (const rule of rules) {
    if (
      rule.type !== 'style' &&
      rule.type !== 'media' &&
      rule.type !== 'container' &&
      rule.type !== 'supports' &&
      rule.type !== 'keyframes'
    )
      continue
    const { value } = rule
    const { loc } = value
    index.set(lines[loc.line] + loc.column - 1, rule)
    if ('rules' in value && value.rules) {
      indexRules(value.rules, lines, index)
    }
  }
}

function atRuleReason(part: SourcePart, rule?: Rule): Reason {
  const name =
    rule?.type ?? /^@(-webkit-)?([\w-]+)/i.exec(part.text)?.[2]?.toLowerCase()
  if (
    name === 'media' ||
    name === 'container' ||
    name === 'supports' ||
    name === 'keyframes'
  )
    return name
  return 'atRule'
}

type Context = { selectors: string[]; reasons: Reason[] }

function inContext(selector: string, context: Context) {
  return [...context.selectors, selector].join(' › ')
}

function addRule(
  part: SourcePart,
  body: SourcePart[],
  context: Context,
  index: Map<number, Rule>,
  lineAt: LineAt,
  result: CssRule[],
) {
  const rule = index.get(part.offset)
  const at = {
    line: lineAt(part.offset),
    selector: inContext(part.text, context),
  }
  if (part.text.startsWith('@')) {
    const reason = atRuleReason(part, rule)
    const reasons = [...new Set<Reason>([...context.reasons, reason])]
    if (
      (reason === 'media' || reason === 'container' || reason === 'supports') &&
      body.length
    ) {
      readRules(
        body,
        { selectors: [...context.selectors, part.text], reasons },
        index,
        lineAt,
        result,
      )
    } else {
      result.push({
        ...at,
        reasons,
        declarations: allDeclarations(body, lineAt),
      })
    }
    return
  }

  if (!part.children) {
    const item = declaration(part, lineAt)
    result.push({
      ...at,
      selector: context.selectors.join(' › ') || part.text,
      reasons: context.reasons.length ? context.reasons : ['parseRule'],
      declarations: item ? [item] : [],
    })
    return
  }

  const split = body.findIndex(
    (child) => child.children || child.text.startsWith('@'),
  )
  const statements = split === -1 ? body : body.slice(0, split)
  const declarations = allDeclarations(statements, lineAt)
  const parsed = rule?.type === 'style' ? rule.value : undefined
  const selectors = sourceSelectors(part, lineAt)
  const sameSelectors = parsed?.selectors.length === selectors.length
  const readable =
    sameSelectors &&
    statements.length === declarations.length &&
    declarationNamesAgree(parsed?.declarations, declarations)

  for (const [offset, at] of selectors.entries()) {
    const selector = sameSelectors ? parsed?.selectors[offset] : undefined
    const first = selector?.[0]
    const reasons = new Set(context.reasons)
    if (selector)
      for (const reason of selectorReasons(selector)) reasons.add(reason)
    const plain = selector?.length === 1 && first?.type === 'class'
    if (!readable) reasons.add('parseRule')
    if (!plain && reasons.size === 0) reasons.add('compound')
    result.push({
      ...at,
      selector: inContext(at.selector, context),
      reasons: [...reasons],
      className: plain && reasons.size === 0 ? first.name : undefined,
      declarations,
      detail: readable
        ? undefined
        : 'Lightning CSS and the source give different rules or declarations.',
    })
  }
  if (split !== -1) {
    readRules(
      body.slice(split),
      {
        selectors: [...context.selectors, part.text],
        reasons: [...new Set<Reason>([...context.reasons, 'nesting'])],
      },
      index,
      lineAt,
      result,
    )
  }
}

function readRules(
  parts: SourcePart[],
  context: Context,
  index: Map<number, Rule>,
  lineAt: LineAt,
  result: CssRule[],
) {
  for (const part of parts)
    addRule(part, part.children ?? [], context, index, lineAt, result)
}

export function readCss(file: string, text: string): CssFile {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?|\f/g, '\n')
  const lines = [
    0,
    ...[...source.matchAll(/\n/g)].map((match) => match.index + 1),
  ]
  const lineAt = lineReader(lines)
  const parts = sourceParts(source)
  const index = new Map<number, Rule>()
  try {
    transform({
      filename: file,
      code: Buffer.from(source),
      cssModules: true,
      errorRecovery: true,
      visitor: {
        StyleSheet(sheet) {
          indexRules(sheet.rules, lines, index)
        },
      },
    })
  } catch (error) {
    return {
      readable: false,
      rules: [
        {
          line: 1,
          selector: 'Entire file',
          reasons: ['parseFile'],
          declarations: allDeclarations(parts, lineAt),
          detail: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
  const rules: CssRule[] = []
  readRules(parts, { selectors: [], reasons: [] }, index, lineAt, rules)
  return { rules, readable: true }
}
